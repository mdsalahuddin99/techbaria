import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { serializeSale, mapPaymentMethodToTenderType } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { salesAccounting } from "./salesAccounting";
import { salesSerial } from "./salesSerial";
import type { SaleUpdateInput } from "./types";

/** Update a completed sale — replaces items, tenders, and syncs stock/serials. Requires MANAGER+. */
export async function update(ctx: Ctx, id: string, input: SaleUpdateInput) {
  requireRole(ctx, "MANAGER");

  if (!input.items?.length) {
    throw new ServiceError("EMPTY_CART", "At least one item is required");
  }

  const warehouseId = input.warehouseId;

  await salesAccounting.validateCustomerAndAccounts(ctx, input.customerId, input.tenders);

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new ServiceError("NOT_FOUND", "Sale not found", 404);
    if (sale.status !== "COMPLETED") {
      throw new ServiceError("CONFLICT", "Only completed sales can be updated");
    }

    // Step 1: Restock old items (reverse of create)
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }

    // Step 2: Release old serials
    const oldItemIds = sale.items.map((i) => i.id);
    const oldProductIds = [...new Set(sale.items.map(item => item.productId))];
    await salesSerial.releaseSerials(tx, "default", sale.warehouseId, oldItemIds, oldProductIds);

    // Step 3: Validate new items stock
    const warehouseStockMap = new Map<string, any>();
    if (warehouseId) {
      const warehouseStocks = await tx.warehouseStock.findMany({
        where: { warehouseId, productId: { in: input.items.map((i) => i.productId) } },
      });
      for (const bs of warehouseStocks) warehouseStockMap.set(bs.productId, bs);
    }
    const products = await tx.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) } },
    });
    const productMap = new Map(products.map((p: any) => [p.id, p]));
    const productSnapshots = new Map<string, { cost: number; name: string }>();

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new ServiceError("NOT_FOUND", `Product ${item.productId} not found`);
      if (Number(product.stock) < item.qty) {
        throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient stock (${product.stock} available, ${item.qty} requested)`);
      }
      productSnapshots.set(item.productId, { cost: Number(product.cost), name: product.name });
    }

    // Step 4: Deduct stock for new items
    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty } },
      });
    }

    // Step 5: Delete old items + tenders
    await tx.saleItem.deleteMany({ where: { saleId: id } });
    await tx.saleTender.deleteMany({ where: { saleId: id } });

    // Step 6: Calculate totals — DUE tenders are credit, not actual payment
    const existingData = (sale.data ?? {}) as Record<string, any>;
    const invoiceNo = (existingData.invoiceNo as string) ?? sale.id.slice(0, 8).toUpperCase();

    const subtotal = input.items.reduce((sum, i) => sum + i.price * i.qty - (i.discount ?? 0), 0);
    const total = subtotal - (input.discount ?? 0) + (input.vat ?? 0) + (input.extraCharges ?? 0);
    const paid = input.tenders
      .filter((t) => t.type !== "Due")
      .reduce((sum, t) => sum + t.amount, 0);
    const due = Math.max(0, total - paid);

    // Step 7: Update sale header + create new items + tenders
    const updated = await tx.sale.update({
      where: { id },
      data: {
        customerId: input.customerId,
        channel: input.channel ?? sale.channel,
        subtotal, discount: input.discount ?? 0, total, paid, due,
        notes: input.notes,
        createdAt: input.date ? new Date(input.date) : undefined,
        data: {
          invoiceNo,
          vat: input.vat ?? 0,
          extraCharges: input.extraCharges ?? 0,
          salesPerson: input.salesPerson,
          destination: input.destination,
          attention: input.attention,
        },

        editedById: ctx.userId,
        editedAt: new Date(),
        items: {
          create: input.items.map((item) => {
            const snap = productSnapshots.get(item.productId);
            return {
              productId: item.productId, name: snap?.name ?? "", qty: item.qty,
              price: item.price, cost: snap?.cost ?? 0, discount: item.discount ?? 0,
              warrantyMonths: item.warrantyMonths ?? null,
            };
          }),
        },
        tenders: {
          create: input.tenders.map((t) => ({
            type: mapPaymentMethodToTenderType(t.type), amount: t.amount,
            accountId: t.accountId, ref: t.ref,
          })),
        },
      },
      include: { items: { include: { serialNumbers: true } } as any, tenders: true, customer: true, editedBy: true, user: true },
    });

    // Step 8: Assign serials for serial-tracked products
    const serialItems = input.items.filter((item) => {
      const product = productMap.get(item.productId);
      return product?.trackSerials;
    });
    if (serialItems.length > 0) {
      await salesSerial.assignSerials(
        tx,
        "default",
        sale.warehouseId,
        updated.items,
        serialItems.map((si) => ({ productId: si.productId, qty: si.qty, serials: si.serials }))
      );
    }

    // Step 9: Update customer due & Wallet/Advance tenders
    if (input.customerId) {
      await salesAccounting.applyCustomerDue(tx, ctx, updated, input.customerId, due, true, Number(sale.due));
      await salesAccounting.applyWalletTenders(tx, ctx, id, input.customerId, input.tenders, true);
    }

    await auditLogService.log(ctx, {
      entity: "Sale",
      entityId: id,
      action: "UPDATE",
      diff: { items: input.items.length, total },
    });

    return updated;
  }, { timeout: 30000 });

  const productIds = [...new Set(input.items.map(item => item.productId))];
  await cache.invalidateSales("default");
  await cache.invalidateSpecificProducts("default", productIds);

  const raw = await prisma.sale.findFirst({
    where: { id },
    include: { items: { include: { serialNumbers: true } } as any, tenders: true, customer: true, editedBy: true, user: true },
  });
  return serializeSale(raw as any);
}
