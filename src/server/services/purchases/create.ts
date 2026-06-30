import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { serializePurchase, encodeNotes, mapPaymentMethodToTenderType } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { inventoryService } from "../inventoryService";
import { PurchaseCreateInput } from "./types";

/** Create a new purchase order. Requires MANAGER+. */
export async function create(ctx: Ctx, input: PurchaseCreateInput) {
  let warehouseId = input.warehouseId;

  // Resolve default warehouse if missing
  if (!warehouseId) {
    let defaultWarehouse = await prisma.warehouse.findFirst();
    if (!defaultWarehouse) {
      defaultWarehouse = await prisma.warehouse.create({
        data: {
          name: "Main Showroom",
          code: "MAIN",
          isActive: true,
        },
      });
    }
    warehouseId = defaultWarehouse.id;
  }

  requireRole(ctx, "ADMIN");

  if (!input.items?.length) {
    throw new ServiceError("VALIDATION", "At least one item is required");
  }

  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId },
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
      where: { id: { in: accountIds } },
      select: { id: true },
    });
    if (accounts.length !== new Set(accountIds).size) {
      throw new ServiceError("VALIDATION", "Invalid or unauthorized financial account", 400);
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.cost * i.qty, 0);
  const total = subtotal - (input.discount ?? 0);

  const raw = await prisma.$transaction(async (tx) => {
    const paid = input.tenders?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const due = Math.max(0, total - paid);

    const created = await tx.purchase.create({
      data: {
        supplier: input.supplierId ? { connect: { id: input.supplierId } } : undefined,
        warehouse: warehouseId ? { connect: { id: warehouseId } } : undefined,
        invoiceNo: input.invoiceNo || undefined,
        subtotal,
        discount: input.discount ?? 0,
        total,
        paid,
        due,
        notes: encodeNotes(input.notes, {
          status: input.status ?? "Ordered",
          expectedDate: input.expectedDate,
        }),
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
        tenders: input.tenders?.length ? {
          create: input.tenders.map((t) => ({
            type: mapPaymentMethodToTenderType(t.type),
            amount: t.amount,
            accountId: t.accountId,
            ref: t.ref,
          })),
        } : undefined,
      },
      include: { items: true, tenders: true, supplier: true },
    });

    // Auto-generate PO number if not provided
    if (!input.invoiceNo) {
      await tx.purchase.update({
        where: { id: created.id },
        data: { invoiceNo: `PO-${created.id.slice(0, 8).toUpperCase()}` },
      });
    }

    // ── Batch-check existing warrantyStartDate (one query instead of N) ──
    const itemsNeedingWarranty = input.items.filter((i) => i.warrantyStartDate);
    const existingWarrantyMap = new Map<string, Date | null>();
    if (itemsNeedingWarranty.length > 0) {
      const existingWarranties = await tx.product.findMany({
        where: { id: { in: itemsNeedingWarranty.map((i) => i.productId) } },
        select: { id: true, warrantyStartDate: true },
      });
      for (const p of existingWarranties) {
        existingWarrantyMap.set(p.id, p.warrantyStartDate);
      }
    }

    // ── Batch-update stock/cost/price for all items (parallel) ──
    await Promise.all(input.items.map(async (item) => {
      const updateData: any = {
        stock: { increment: item.qty },
        cost: item.cost,
        price: (item.salePrice !== undefined && item.salePrice > 0) ? item.salePrice : item.cost,
      };

      // Set warrantyStartDate only if not already set on the product
      if (item.warrantyStartDate) {
        const existing = existingWarrantyMap.get(item.productId);
        if (!existing) {
          updateData.warrantyStartDate = new Date(item.warrantyStartDate);
        }
      }

      await tx.product.update({
        where: { id: item.productId },
        data: updateData,
      });

      if (warehouseId) {
        await tx.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: warehouseId, productId: item.productId } },
          create: { warehouseId: warehouseId, productId: item.productId, qty: item.qty },
          update: { qty: { increment: item.qty } },
        });
      }
    }));

    // Update supplier payable if applicable
    if (input.supplierId && due > 0) {
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: { payable: { increment: due } },
      });
    }

    const walletTenders = (input.tenders ?? []).filter(t => t.type === "WALLET" || t.type === "Wallet");
    const accountTenders = (input.tenders ?? []).filter(t => t.type !== "WALLET" && t.type !== "Wallet" && t.accountId && t.amount > 0);

    // Deduct from Supplier advance
    if (walletTenders.length > 0 && input.supplierId) {
      const walletAmount = walletTenders.reduce((sum, t) => sum + t.amount, 0);
      
      const supp = await tx.supplier.findUnique({
        where: { id: input.supplierId },
        select: { advanceBalance: true }
      });
      
      const currentAdvance = Number(supp?.advanceBalance || 0);
      if (walletAmount > currentAdvance) {
        throw new ServiceError("CONFLICT", "Insufficient supplier advance balance", 409);
      }
      
      const newAdvance = currentAdvance - walletAmount;
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: { advanceBalance: newAdvance }
      });
      
      await tx.supplierTransaction.create({
        data: {
          supplierId: input.supplierId,
          type: "PURCHASE",
          amount: walletAmount,
          balanceBefore: currentAdvance,
          balanceAfter: newAdvance,
          purchaseId: created.id,
          notes: `Advance used for purchase invoice ${input.invoiceNo || created.invoiceNo || created.id.slice(0, 8)}`
        }
      });
    }

    // Deduct from each tender's account balance (parallel batch)
    await Promise.all(accountTenders.map((t) =>
        tx.financialAccount.update({
          where: { id: t.accountId! },
          data: { balance: { decrement: t.amount } },
        }),
      ),
    );

    // ── Batch-create SerialNumber records (single query) ──
    const serialEntries = input.items
      .filter((item) => item.serials?.length)
      .flatMap((item) => {
        const purchaseItem = created.items.find((pi) => pi.productId === item.productId);
        if (!purchaseItem) return [];
        return item.serials!.map((serial) => ({
          productId: item.productId,
          serial,
          status: "IN_STOCK" as const,
          purchaseItemId: purchaseItem.id,
          warehouseId: warehouseId || null,
        }));
      });

    if (serialEntries.length > 0) {
      await tx.serialNumber.createMany({ data: serialEntries, skipDuplicates: true });

      // For tracked products, sync Product.stock = actual IN_STOCK serial count (Fix #4)
      const trackedProductIds = [...new Set(serialEntries.map((s) => s.productId))];
      await inventoryService.syncStockCounts(tx, warehouseId, trackedProductIds);
    }

    return created;
  }, { timeout: 30000 });

  // Audit log OUTSIDE transaction so a failure here doesn't roll back the PO
  await auditLogService.log(ctx, {
    entity: "Purchase",
    entityId: raw.id,
    action: "CREATE",
    diff: { total, items: input.items.length, supplierId: input.supplierId },
  });

  await cache.invalidatePurchases();
  const productIds = [...new Set(input.items.map(item => item.productId))];
  await cache.invalidateSpecificProducts(productIds);

  return serializePurchase(raw);
}
