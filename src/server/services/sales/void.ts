import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { cache } from "@/lib/cache";
import { salesAccounting } from "./salesAccounting";
import { salesSerial } from "./salesSerial";

/** Void (cancel) a sale — restores stock and reverses customer due. Requires MANAGER+. */
export async function voidSale(ctx: Ctx, id: string, reason: string) {
  requireRole(ctx, "ADMIN");

  const { updatedSale, productIds } = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id },
      include: { items: true, tenders: true },
    });
    if (!sale) throw new ServiceError("NOT_FOUND", "Sale not found", 404);
    if (sale.status !== "COMPLETED") {
      throw new ServiceError("CONFLICT", "Only completed sales can be voided");
    }

    // Fetch warehouse stock if sale was from a warehouse
    const warehouseId = sale.warehouseId;
    const warehouseStocks = warehouseId ? await tx.warehouseStock.findMany({
      where: { warehouseId, productId: { in: sale.items.map(i => i.productId) } },
    }) : [];
    const warehouseStockMap = new Map<string, (typeof warehouseStocks)[number]>(warehouseStocks.map((bs) => [bs.productId, bs]) as [string, (typeof warehouseStocks)[number]][]);

    // Restore total product stock (parallel batch)
    await Promise.all(sale.items.map((item) => {
      const ops: Promise<unknown>[] = [
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        }),
      ];

      // Restore warehouse stock if applicable
      if (warehouseId) {
        const warehouseStock = warehouseStockMap.get(item.productId);
        if (warehouseStock) {
          ops.push(
            tx.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: { qty: { increment: item.qty } },
            }),
          );
        } else {
          ops.push(
            tx.warehouseStock.create({
              data: { warehouseId, productId: item.productId, qty: item.qty },
            }),
          );
        }
      }
      return Promise.all(ops);
    }));

    // Release serial numbers back to IN_STOCK via salesSerial sub-service
    const saleItemIds = sale.items.map((i) => i.id);
    const productIds = [...new Set(sale.items.map(item => item.productId))];
    await salesSerial.releaseSerials(tx, "default", warehouseId, saleItemIds, productIds);

    // Reverse customer due + restore wallet balance + record ledger (void)
    if (sale.customerId) {
      const dueAmount = Number(sale.due);
      await salesAccounting.restoreWalletTenders(tx, ctx, sale.id, sale.customerId, sale.tenders, reason);
      if (dueAmount > 0) {
        await salesAccounting.revertCustomerDue(tx, ctx, sale.id, sale.customerId, dueAmount, false);
      }
    }

    const updatedSale = await tx.sale.update({
      where: { id },
      data: { status: "VOIDED", notes: `VOIDED: ${reason}` },
    });
    return { updatedSale, productIds };
  }, { timeout: 30000 });

  await cache.invalidateSales("default");
  await cache.invalidateSpecificProducts("default", productIds);
  return updatedSale;
}
