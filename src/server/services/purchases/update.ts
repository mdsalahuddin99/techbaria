import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { serializePurchase, encodeNotes } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { PurchaseUpdateInput } from "./types";

/** Edit a purchase — updates stock, serials, and all line items. */
export async function update(ctx: Ctx, id: string, input: PurchaseUpdateInput) {
  requireRole(ctx, "MANAGER");

  if (!input.items?.length) {
    throw new ServiceError("VALIDATION", "At least one item is required");
  }

  const branchId = input.branchId ?? ctx.branchId;
  const warehouseId = input.warehouseId;

  if (warehouseId) {
    const selectedWarehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { branchId: true },
    });
    if (selectedWarehouse && selectedWarehouse.branchId !== branchId) {
      throw new ServiceError('VALIDATION', 'Warehouse-Branch Mismatch');
    }
  }

  const existing = await prisma.purchase.findFirst({
    where: { id, shopId: ctx.shopId },
    select: {
      id: true,
      invoiceNo: true,
      paid: true,
      warehouseId: true,
      items: { select: { productId: true, qty: true } },
    },
  });
  if (!existing) throw new ServiceError("NOT_FOUND", "Purchase not found", 404);

  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!supplier) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }
  }

  const accountIds = (input.tenders ?? [])
    .map((t) => t.accountId)
    .filter((id): id is string => !!id);
  if (accountIds.length > 0) {
    const accounts = await prisma.financialAccount.findMany({
      where: { id: { in: accountIds }, shopId: ctx.shopId },
      select: { id: true },
    });
    if (accounts.length !== new Set(accountIds).size) {
      throw new ServiceError("VALIDATION", "Invalid or unauthorized financial account", 400);
    }
  }

  const oldQtyMap = new Map(existing.items.map((i) => [i.productId, i.qty]));

  const subtotal = input.items.reduce((sum, i) => sum + i.cost * i.qty, 0);
  const total = subtotal - (input.discount ?? 0);
  const paid = input.tenders?.reduce((sum, t) => sum + t.amount, 0) ?? Number(existing.paid);
  const due = Math.max(0, total - paid);

  const raw = await prisma.$transaction(async (tx) => {
    // 1. Collect old serials for this purchase
    const oldSerials = await tx.serialNumber.findMany({
      where: { purchaseItem: { purchaseId: id }, shopId: ctx.shopId },
      select: { id: true, serial: true, productId: true },
    });
    const oldSerialsSet = new Map<string, Set<string>>();
    for (const s of oldSerials) {
      const set = oldSerialsSet.get(s.productId) ?? new Set();
      set.add(s.serial);
      oldSerialsSet.set(s.productId, set);
    }

    // 2. Delete old purchase items (cascade removes FK link for serials)
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

    // 3. Delete serials that are no longer in input
    const inputSerialsByProduct = new Map<string, Set<string>>();
    for (const item of input.items) {
      if (item.serials?.length) {
        inputSerialsByProduct.set(item.productId, new Set(item.serials));
      }
    }
    for (const s of oldSerials) {
      const inputSet = inputSerialsByProduct.get(s.productId);
      if (!inputSet || !inputSet.has(s.serial)) {
        await tx.serialNumber.delete({ where: { id: s.id } }).catch(() => {});
      }
    }

    // 4. Re-create purchase items + update purchase header
    const updated = await tx.purchase.update({
      where: { id },
      data: {
        supplierId: input.supplierId,
        discount: input.discount ?? 0,
        notes: encodeNotes(input.notes, {
          status: input.status ?? "Ordered",
          expectedDate: input.expectedDate,
        }),
        subtotal,
        total,
        paid,
        due,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            cost: item.cost,
            extraCost: item.extraCost,
            name: item.name,
            salePrice: item.salePrice,
            serials: item.serials ?? [],
            warrantyStartDate: item.warrantyStartDate ? new Date(item.warrantyStartDate) : undefined,
            warrantyMonths: item.warrantyMonths,
          })),
        },
      },
      include: { items: true, tenders: true, supplier: true },
    });

    // 5. Get fresh items + create new serials
    const freshItems = await tx.purchaseItem.findMany({
      where: { purchaseId: id },
    });

    for (const item of input.items) {
      const pi = freshItems.find((pi) => pi.productId === item.productId);
      const oldQty = oldQtyMap.get(item.productId) ?? 0;

      // 5a. Create new serials that don't already exist
      if (item.serials?.length && pi) {
        const existingSet = oldSerialsSet.get(item.productId) ?? new Set();
        const newSerials = item.serials.filter((s) => !existingSet.has(s));
        if (newSerials.length > 0) {
          await tx.serialNumber.createMany({
            data: newSerials.map((serial) => ({
              shopId: ctx.shopId,
              productId: item.productId,
              serial,
              status: "IN_STOCK" as const,
              purchaseItemId: pi.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 5b. Adjust product stock (non-serial items only)
      const qtyDiff = item.qty - oldQty;
      if (qtyDiff !== 0) {
        // Only manual adjust if not serial-tracked (serial trackers are synced below)
        if (!item.serials?.length) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: qtyDiff } },
          });
        }
        if (existing.warehouseId) {
          await tx.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId: existing.warehouseId, productId: item.productId } },
            create: { warehouseId: existing.warehouseId, productId: item.productId, qty: Math.max(0, qtyDiff) },
            update: { qty: { increment: qtyDiff } },
          });
        }
      }

      // 5c. Update product cost/price
      await tx.product.update({
        where: { id: item.productId },
        data: {
          cost: item.cost,
          price: (item.salePrice !== undefined && item.salePrice > 0) ? item.salePrice : item.cost,
        },
      });
    }

    // ── Handle removed products (in old but not in new items) ──
    for (const [productId, oldQty] of oldQtyMap) {
      const stillExists = input.items.some((i) => i.productId === productId);
      if (!stillExists) {
        // Check if this product had serials (they were already deleted in step 3)
        const hadSerials = (oldSerialsSet.get(productId)?.size ?? 0) > 0;
        if (!hadSerials) {
          // Non-serial product was removed — decrement stock manually
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: oldQty } },
          });
        }
        if (existing.warehouseId) {
          await tx.warehouseStock.updateMany({
            where: { warehouseId: existing.warehouseId, productId },
            data: { qty: { decrement: oldQty } },
          });
        }
        // Serial-tracked products are handled by step 6 below (count will be 0 → stock = 0)
      }
    }

    // 6. Sync stock for serial-tracked products
    const trackedProducts = [
      ...new Set(
        oldSerials.map((s) => s.productId)
          .concat(input.items.filter((i) => i.serials?.length).map((i) => i.productId)),
      ),
    ];
    if (trackedProducts.length > 0) {
      const counts = await tx.serialNumber.groupBy({
        by: ["productId"],
        where: { productId: { in: trackedProducts }, status: "IN_STOCK" },
        _count: { productId: true },
      });
      for (const c of counts) {
        await tx.product.update({
          where: { id: c.productId },
          data: { stock: c._count.productId },
        });
      }
    }

    return updated;
  }, { timeout: 30000 });

  await auditLogService.log(ctx, {
    entity: "Purchase",
    entityId: id,
    action: "UPDATE",
    diff: { total, items: input.items.length },
  });

  await cache.invalidatePurchases(ctx.shopId);
  const productIds = [...new Set(input.items.map(item => item.productId))];
  await cache.invalidateSpecificProducts(ctx.shopId, productIds);

  return serializePurchase(raw);
}
