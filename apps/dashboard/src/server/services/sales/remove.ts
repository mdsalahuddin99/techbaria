import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { salesAccounting } from "./salesAccounting";
import { salesSerial } from "./salesSerial";

/** Permanently delete a completed sale — restores stock, serials, and customer due. Requires MANAGER+. */
export async function remove(ctx: Ctx, id: string) {
  requireRole(ctx, "ADMIN");

  const productIds = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id },
      include: { items: true, tenders: true },
    });
    if (!sale) throw new ServiceError("NOT_FOUND", "Sale not found", 404);
    if (sale.status !== "COMPLETED") {
      throw new ServiceError("CONFLICT", "Only completed sales can be deleted");
    }

    // Fetch warehouse stock if sale was from a warehouse
    const warehouseId = sale.warehouseId;
    const warehouseStocks = warehouseId ? await tx.warehouseStock.findMany({
      where: { warehouseId, productId: { in: sale.items.map(i => i.productId) } },
    }) : [];
    const warehouseStockMap = new Map<string, (typeof warehouseStocks)[number]>(
      warehouseStocks.map((ws) => [ws.productId, ws]) as [string, (typeof warehouseStocks)[number]][]
    );

    // Restore product stock (global & warehouse)
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });

      if (warehouseId) {
        const warehouseStock = warehouseStockMap.get(item.productId);
        if (warehouseStock) {
          await tx.warehouseStock.update({
            where: { id: warehouseStock.id },
            data: { qty: { increment: item.qty } },
          });
        } else {
          await tx.warehouseStock.create({
            data: { warehouseId, productId: item.productId, qty: item.qty },
          });
        }
      }
    }

    // Release serial numbers back to IN_STOCK
    const saleItemIds = sale.items.map((i) => i.id);
    const productIds = [...new Set(sale.items.map(item => item.productId))];
    await salesSerial.releaseSerials(tx, "default", sale.warehouseId, saleItemIds, productIds);

    // Reverse customer due + restore wallet balance + record ledger (delete)
    if (sale.customerId) {
      await salesAccounting.restoreWalletTenders(tx, ctx, sale.id, sale.customerId, sale.tenders, "Sale deleted");
      if (Number(sale.due) > 0) {
        const dueAmount = Number(sale.due);
        await salesAccounting.revertCustomerDue(tx, ctx, sale.id, sale.customerId, dueAmount, true);
      }
      await salesAccounting.recordCustomerSpent(tx, sale.customerId, Number(sale.total), true);
    }

    // Revert financial account balances (money out)
    await salesAccounting.revertSaleTenders(tx, ctx, sale.id, sale.tenders);

    // Delete sale (cascade deletes items + tenders)
    await tx.sale.delete({ where: { id } });

    await auditLogService.log(ctx, {
      entity: "Sale",
      entityId: id,
      action: "DELETE",
      diff: { invoiceNo: id.slice(0, 8).toUpperCase(), total: Number(sale.total) },
    });
    
    return productIds;
  }, { timeout: 30000 });

  await cache.invalidateSales();
  await cache.invalidateSpecificProducts(productIds);
}
