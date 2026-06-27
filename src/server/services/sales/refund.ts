import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { cache } from "@/lib/cache";
import { salesAccounting } from "./salesAccounting";
import { salesSerial } from "./salesSerial";
import type { RefundInput } from "./types";

/** Refund a sale (partial or full). Requires MANAGER+. */
export async function refund(ctx: Ctx, id: string, input: RefundInput) {
  requireRole(ctx, "ADMIN");

  const raw = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new ServiceError("NOT_FOUND", "Sale not found", 404);

    // Fetch warehouse stock if sale was from a warehouse
    const warehouseId = sale.warehouseId;
    const warehouseStocks = warehouseId ? await tx.warehouseStock.findMany({
      where: { warehouseId, productId: { in: input.items.map(i => i.productId) } },
    }) : [];
    const warehouseStockMap = new Map<string, (typeof warehouseStocks)[number]>(warehouseStocks.map((bs) => [bs.productId, bs]) as [string, (typeof warehouseStocks)[number]][]);

    // Release serial numbers back to IN_STOCK (find matching saleItems)
    const refundItemIds = input.items
      .filter((i) => i.restock)
      .map((refundItem) => {
        const saleItem = sale.items.find((si) => si.productId === refundItem.productId);
        return saleItem?.id;
      })
      .filter(Boolean) as string[];

    const restockedProductIds = input.items.filter((i) => i.restock).map((i) => i.productId);
    if (refundItemIds.length > 0) {
      await salesSerial.releaseSerials(tx, "default", warehouseId, refundItemIds, restockedProductIds);
    }

    // Restock items in parallel (only those marked for restock)
    await Promise.all(input.items.filter((i) => i.restock).map(async (refundItem) => {
      const ops: Promise<unknown>[] = [
        tx.product.update({
          where: { id: refundItem.productId },
          data: { stock: { increment: refundItem.qty } },
        }),
      ];

      // Restore warehouse stock if applicable
      if (warehouseId) {
        const warehouseStock = warehouseStockMap.get(refundItem.productId);
        if (warehouseStock) {
          ops.push(
            tx.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: { qty: { increment: refundItem.qty } },
            }),
          );
        } else {
          ops.push(
            tx.warehouseStock.create({
              data: { warehouseId, productId: refundItem.productId, qty: refundItem.qty },
            }),
          );
        }
      }
      await Promise.all(ops);
    }));

    // Calculate refund amount proportional to items being returned
    const refundAmount = input.items.reduce((sum, ri) => {
      const saleItem = sale.items.find((si) => si.productId === ri.productId);
      return sum + (saleItem ? (Number(saleItem.price) * ri.qty) - Number(saleItem.discount || 0) : 0);
    }, 0);

    // Record refund CustomerTransaction if sale had a customer
    if (sale.customerId && refundAmount > 0) {
      await salesAccounting.applyRefundBalance(tx, ctx, sale.id, sale.customerId, refundAmount);
    }

    const updatedSale = await tx.sale.update({
      where: { id },
      data: { status: "REFUNDED", notes: `REFUND: ${input.reason}` },
    });
    return updatedSale;
  }, { timeout: 30000 });

  const productIds = [...new Set(input.items.map(item => item.productId))];
  await cache.invalidateSales("default");
  await cache.invalidateSpecificProducts("default", productIds);
  return raw;
}
