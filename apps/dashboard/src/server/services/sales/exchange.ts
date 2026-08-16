import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { cache } from "@/lib/cache";
import { salesAccounting } from "./salesAccounting";
import { salesSerial } from "./salesSerial";
import { mapPaymentMethodToTenderType, serializeSale } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";
import type { ExchangeInput } from "./types";
import * as math from "@/server/lib/math";

export async function exchange(ctx: Ctx, input: ExchangeInput) {
  requireRole(ctx, "ADMIN");

  if (!input.newItems?.length && !input.returnItems?.length) {
    throw new ServiceError("INVALID_INPUT", "Must provide items to return or exchange");
  }

  const raw = await prisma.$transaction(async (tx): Promise<any> => {
    // 1. Find original sale
    const oldSale = await tx.sale.findUnique({
      where: { id: input.originalSaleId },
      include: { items: true },
    });
    if (!oldSale) throw new ServiceError("NOT_FOUND", "Original sale not found", 404);

    const warehouseId = oldSale.warehouseId;

    // --- STEP 1: Process Returns ---
    const returnProductIds = input.returnItems.map((i) => i.productId);
    let totalReturnAmount = 0;

    if (input.returnItems.length > 0) {
      const warehouseStocks = warehouseId
        ? await tx.warehouseStock.findMany({
            where: { warehouseId, productId: { in: returnProductIds } },
          })
        : [];
      const warehouseStockMap = new Map(warehouseStocks.map((bs) => [bs.productId, bs]));

      const refundItemIds = input.returnItems
        .filter((i) => i.restock)
        .map((refundItem) => {
          const saleItem = oldSale.items.find((si) => si.productId === refundItem.productId);
          return saleItem?.id;
        })
        .filter(Boolean) as string[];

      const restockedProductIds = input.returnItems.filter((i) => i.restock).map((i) => i.productId);
      if (refundItemIds.length > 0) {
        await salesSerial.releaseSerials(tx, "default", warehouseId, refundItemIds, restockedProductIds);
      }

      await Promise.all(
        input.returnItems.map(async (refundItem) => {
          const saleItem = oldSale.items.find((si) => si.productId === refundItem.productId);
          if (!saleItem) return;

          totalReturnAmount = math.add(
            totalReturnAmount,
            math.sub(math.mul(Number(saleItem.price), refundItem.qty), Number(saleItem.discount || 0))
          );

          if (refundItem.restock) {
            const ops: Promise<unknown>[] = [
              tx.product.update({
                where: { id: refundItem.productId },
                data: { stock: { increment: refundItem.qty } },
              }),
              tx.inventoryLot.create({
                data: {
                  productId: refundItem.productId,
                  warehouseId: warehouseId || null,
                  qtyOriginal: refundItem.qty,
                  qtyRemaining: refundItem.qty,
                  unitCost: saleItem.cost,
                  sourceType: "RETURN",
                  sourceId: oldSale.id,
                },
              }),
            ];

            if (warehouseId) {
              const warehouseStock = warehouseStockMap.get(refundItem.productId);
              if (warehouseStock) {
                ops.push(
                  tx.warehouseStock.update({
                    where: { id: warehouseStock.id },
                    data: { qty: { increment: refundItem.qty } },
                  })
                );
              } else {
                ops.push(
                  tx.warehouseStock.create({
                    data: { warehouseId, productId: refundItem.productId, qty: refundItem.qty },
                  })
                );
              }
            }
            await Promise.all(ops);
          }
        })
      );
    }

    // --- STEP 2: Process New Sale ---
    let newSale = null;
    let totalNewAmount = 0;
    
    if (input.newItems.length > 0) {
      // Validate stock for new items
      const newProductIds = input.newItems.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: newProductIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const trackedProductIds = products.filter((p) => p.trackSerials).map((p) => p.id);
      const [newWarehouseStocks, serialCountRows] = await Promise.all([
        warehouseId ? tx.warehouseStock.findMany({ where: { warehouseId, productId: { in: newProductIds } } }) : [],
        trackedProductIds.length > 0
          ? tx.serialNumber.groupBy({
              by: ["productId"],
              where: {
                productId: { in: trackedProductIds },
                status: "IN_STOCK",
                ...(warehouseId && { warehouseId }),
              },
              _count: { productId: true },
            })
          : [],
      ]);

      const newWarehouseStockMap = new Map(newWarehouseStocks.map((ws) => [ws.productId, ws] as const));
      const serialCounts = new Map(serialCountRows.map((c) => [c.productId, c._count.productId] as const));
      const productSnapshots = new Map<string, { cost: number; name: string }>();

      for (const item of input.newItems) {
        const product = productMap.get(item.productId);
        if (!product) throw new ServiceError("NOT_FOUND", `Product ${item.productId} not found`);

        if (!product.isService) {
          if (product.trackSerials) {
            const serialCount = Number(serialCounts.get(item.productId) ?? 0);
            if (serialCount < item.qty) {
              throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient serial stock (${serialCount} available)`);
            }
          } else if (warehouseId) {
            const warehouseStock = newWarehouseStockMap.get(item.productId);
            if (!warehouseStock || Number(warehouseStock.qty) < item.qty) {
              throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient stock in warehouse`);
            }
          } else {
            if (Number(product.stock) < item.qty) {
              throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient stock`);
            }
          }
        }
        productSnapshots.set(item.productId, { cost: Number(product.cost), name: product.name });
      }

      // Calculate totals for new items
      const subtotal = input.newItems.reduce(
        (sum, i) => math.add(sum, math.sub(math.mul(i.price, i.qty), i.discount ?? 0)),
        0
      );
      totalNewAmount = subtotal; // Assuming no extra vat/charges for exchange for now

      // Generate invoice No
      const [count, shop] = await Promise.all([
        tx.sale.count(),
        tx.shop.findFirst({ select: { settings: true } }),
      ]);
      const stored = (shop?.settings ?? {}) as Record<string, any>;
      const prefix = (stored.invoiceNumberPrefix as string) ?? "STAN";
      const currentYear = new Date().getFullYear().toString();
      const invoiceNo = `${prefix}${currentYear}${(stored.invoiceNumberStartSeq as number ?? 500) + count}`;

      const paid = (input.tenders || []).reduce((sum, t) => math.add(sum, t.amount), 0);
      const due = Math.max(0, math.sub(totalNewAmount, math.add(totalReturnAmount, paid))); // Accounting for return amount

      newSale = await tx.sale.create({
        data: {
          userId: ctx.userId,
          warehouseId: warehouseId ?? null,
          customerId: oldSale.customerId,
          channel: oldSale.channel,
          status: "COMPLETED",
          subtotal,
          discount: 0,
          total: totalNewAmount,
          paid: math.add(totalReturnAmount, paid), // Treat the return value as paid amount for the new invoice
          due,
          notes: `Exchange for Invoice ${oldSale.id.slice(0, 8).toUpperCase()}. ${input.notes || ""}`,
          data: { invoiceNo },
          items: {
            create: input.newItems.map((item) => {
              const snap = productSnapshots.get(item.productId);
              return {
                productId: item.productId,
                name: item.name || snap?.name || "",
                qty: item.qty,
                price: item.price,
                cost: snap?.cost ?? 0,
                discount: item.discount ?? 0,
                warrantyMonths: item.warrantyMonths ?? null,
              };
            }),
          },
          tenders: {
            create: (input.tenders || []).map((t) => ({
              type: mapPaymentMethodToTenderType(t.type),
              amount: t.amount,
              accountId: t.accountId ?? null,
              ref: t.ref ?? null,
            })),
          },
        },
        include: { items: true, tenders: true, customer: true, editedBy: true, user: true },
      });

      // Decrement stock for new items
      const productQtyMap = new Map<string, number>();
      for (const item of input.newItems) {
        if (productMap.get(item.productId)?.isService) continue;
        productQtyMap.set(item.productId, (productQtyMap.get(item.productId) ?? 0) + item.qty);
      }

      await Promise.all(
        Array.from(productQtyMap.entries()).map(async ([productId, qty]) => {
          await tx.product.update({ where: { id: productId }, data: { stock: { decrement: qty } } });
          if (warehouseId) {
            const ws = newWarehouseStockMap.get(productId);
            if (ws) {
              await tx.warehouseStock.update({ where: { id: ws.id }, data: { qty: { decrement: qty } } });
            } else {
              await tx.warehouseStock.create({ data: { warehouseId, productId, qty: -qty } });
            }
          }
        })
      );

      // Assign serials & Deplete Lots
      await salesSerial.assignSerials(
        tx,
        "default",
        warehouseId,
        newSale.items,
        input.newItems.map((i) => ({ productId: i.productId, qty: i.qty, serials: i.serials })),
        true
      );

      const { inventoryLotService } = require("../inventoryLotService");
      await Promise.all(
        newSale.items.map(async (si: any) => {
          const product = productMap.get(si.productId);
          if (product?.trackSerials || product?.isService) return;
          const totalFifoCost = await inventoryLotService.depleteLots(tx, si.productId, si.qty, warehouseId);
          if (totalFifoCost > 0 && si.qty > 0) {
            await tx.saleItem.update({
              where: { id: si.id },
              data: { cost: totalFifoCost / si.qty },
            });
          }
        })
      );
    }

    // --- STEP 3: Financial Accounting ---
    const netDifference = math.sub(totalNewAmount, totalReturnAmount);

    if (oldSale.customerId) {
      if (netDifference > 0) {
        // Customer owes money (handled via new sale tenders and due)
        if (newSale) {
          const dueAmount = Math.max(0, math.sub(netDifference, (input.tenders || []).reduce((sum, t) => math.add(sum, t.amount), 0)));
          await salesAccounting.applyCustomerDue(tx, ctx, newSale, oldSale.customerId, dueAmount, false);
          await salesAccounting.recordCustomerSpent(tx, oldSale.customerId, netDifference, false);
          await salesAccounting.applySaleTenders(tx, ctx, newSale.id, input.tenders || []);
        }
      } else if (netDifference < 0) {
        // Shop owes customer money
        const refundAmount = Math.abs(netDifference);
        await salesAccounting.applyRefundBalance(tx, ctx, oldSale.id, oldSale.customerId, refundAmount);
        await salesAccounting.recordCustomerSpent(tx, oldSale.customerId, refundAmount, true);
        // Deduct from financial account if refundMethod is provided
        if (input.refundMethod && input.refundMethod !== "WALLET") {
          const acc = await tx.financialAccount.findFirst({ where: { name: input.refundMethod } });
          if (acc) {
            await tx.financialAccount.update({
              where: { id: acc.id },
              data: { balance: { decrement: refundAmount } },
            });
          }
        }
      }
    } else {
      // Walk-in customer
      if (netDifference > 0 && newSale) {
        await salesAccounting.applySaleTenders(tx, ctx, newSale.id, input.tenders || []);
      } else if (netDifference < 0) {
        const refundAmount = Math.abs(netDifference);
        if (input.refundMethod) {
          const acc = await tx.financialAccount.findFirst({ where: { name: input.refundMethod } });
          if (acc) {
            await tx.financialAccount.update({
              where: { id: acc.id },
              data: { balance: { decrement: refundAmount } },
            });
          }
        }
      }
    }

    // --- STEP 4: Update Old Invoice Status ---
    const oldSaleData = (oldSale.data as Record<string, any>) || {};
    const fullyReturned = oldSale.items.every((si) => {
      const retItem = input.returnItems.find(ri => ri.productId === si.productId);
      return retItem && retItem.qty >= si.qty;
    });

    await tx.sale.update({
      where: { id: oldSale.id },
      data: {
        status: fullyReturned && input.newItems.length === 0 ? "REFUNDED" : "EXCHANGED",
        notes: `Exchange processed. ${input.reason}. ${newSale ? `See Invoice ${newSale.id.slice(0, 8).toUpperCase()}` : ""}`,
        data: {
          ...oldSaleData,
          exchangeNewSaleId: newSale?.id,
          reason: input.reason,
        }
      }
    });

    if (newSale) {
      await auditLogService.log(ctx, {
        entity: "Sale",
        entityId: newSale.id,
        action: "CREATE",
        diff: { note: "Created via Exchange", items: newSale.items.length, total: Number(newSale.total) },
      });
    }

    return newSale || oldSale;
  }, { timeout: 40000 });

  const pIds = [
    ...input.returnItems.map(i => i.productId),
    ...input.newItems.map(i => i.productId)
  ];
  await cache.invalidateSales();
  await cache.invalidateSpecificProducts([...new Set(pIds)]);

  return raw;
}
