import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import { serializeSale, mapPaymentMethodToTenderType } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { salesAccounting } from "./salesAccounting";
import { salesSerial } from "./salesSerial";
import type { SaleCreateInput } from "./types";

/** Validate stock availability for all sale items. Throws OUT_OF_STOCK if insufficient. */
async function __validateItemsStock(
  tx: any,
  ctx: Ctx,
  input: SaleCreateInput,
  warehouseId: string | null | undefined,
): Promise<{
  productMap: Map<string, any>;
  warehouseStockMap: Map<string, any>;
  productSnapshots: Map<string, { cost: number; name: string }>;
}> {
  const productIds = input.items.map((i) => i.productId);
  const products: any[] = await tx.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p: any) => [p.id, p]));

  const trackedProductIds = products.filter((p: any) => p.trackSerials).map((p: any) => p.id);
  const [warehouseStocks, serialCountRows] = await Promise.all([
    warehouseId ? tx.warehouseStock.findMany({ where: { warehouseId, productId: { in: productIds } } }) : [],
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

  const warehouseStockMap = new Map<string, any>(warehouseStocks.map((ws: any) => [ws.productId, ws]));
  const serialCounts = new Map<string, number>(serialCountRows.map((c: any) => [c.productId, c._count.productId]));
  const productSnapshots = new Map<string, { cost: number; name: string }>();

  const updates: Promise<any>[] = [];
  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new ServiceError("NOT_FOUND", `Product ${item.productId} not found`);

    if (product.trackSerials) {
      const serialCount = Number(serialCounts.get(item.productId) ?? 0);
      if (serialCount < item.qty) {
        throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient serial stock (${serialCount} serials available, ${item.qty} requested)`);
      }
      if (Number(product.stock) < item.qty) {
        updates.push(tx.product.update({ where: { id: product.id }, data: { stock: serialCount } }));
      }
    } else if (warehouseId) {
      const warehouseStock = warehouseStockMap.get(item.productId);
      if (!warehouseStock || Number(warehouseStock.qty) < item.qty) {
        throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient stock in selected warehouse (${warehouseStock?.qty ?? 0} available, ${item.qty} requested)`);
      }
    } else {
      if (Number(product.stock) < item.qty) {
        throw new ServiceError("OUT_OF_STOCK", `${product.name} has insufficient stock (${product.stock} available, ${item.qty} requested)`);
      }
    }
    productSnapshots.set(item.productId, { cost: Number(product.cost), name: product.name });
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return { productMap, warehouseStockMap, productSnapshots };
}

/** Post-create: audit log + cache invalidation. */
async function __postProcess(ctx: Ctx, raw: any, productIds: string[]) {
  await Promise.all([
    auditLogService.log(ctx, {
      entity: "Sale",
      entityId: raw.id,
      action: "CREATE",
      diff: { items: raw.items?.length ?? 0, total: Number(raw.total), tenders: raw.tenders?.length ?? 0 },
    }),
    cache.invalidateSales(),
    cache.invalidateSpecificProducts(productIds),
  ]);
}

/** Create a new sale — validates stock → creates records → assigns serials → logs. */
export async function create(ctx: Ctx, input: SaleCreateInput) {
  if (!input.items?.length) {
    throw new ServiceError("EMPTY_CART", "Cart is empty");
  }
  const warehouseId = input.warehouseId;

  // Scoping validations for customer and accounts (runs in parallel internally)
  await salesAccounting.validateCustomerAndAccounts(ctx, input.customerId, input.tenders);

  // Step 1: Validate stock + prepare data (inside transaction)
  const raw = await prisma.$transaction(async (tx): Promise<any> => {
    const { warehouseStockMap, productSnapshots } = await __validateItemsStock(tx, ctx, input, warehouseId);

    // Calculate totals — DUE tenders are credit, not actual payment
    const [count, shop] = await Promise.all([
      tx.sale.count(),
      tx.shop.findFirst({ select: { settings: true } }),
    ]);
    const stored = (shop?.settings ?? {}) as Record<string, any>;
    const prefix = (stored.invoiceNumberPrefix as string) ?? "STAN";
    const startSeq = (stored.invoiceNumberStartSeq as number) ?? 500;
    const currentYear = new Date().getFullYear().toString();
    const invoiceNo = `${prefix}${currentYear}${startSeq + count}`;

    const subtotal = input.items.reduce((sum, i) => sum + i.price * i.qty - (i.discount ?? 0), 0);
    const total = subtotal - (input.discount ?? 0) + (input.vat ?? 0) + (input.extraCharges ?? 0);
    const paid = input.tenders
      .filter((t) => t.type !== "Due")
      .reduce((sum, t) => sum + t.amount, 0);
    const due = Math.max(0, total - paid);

    // Create sale with items and tenders
    const sale = await tx.sale.create({
      data: {
        userId: ctx.userId,
        warehouseId: warehouseId ?? null,
        customerId: input.customerId ?? null,
        channel: input.channel ?? "POS",
        status: "COMPLETED",
        subtotal, discount: input.discount ?? 0, total, paid, due,
        notes: input.notes ?? null,
        createdAt: input.date ? new Date(input.date) : undefined,
        data: {
          invoiceNo,
          vat: input.vat ?? 0,
          extraCharges: input.extraCharges ?? 0,
          salesPerson: input.salesPerson ?? null,
          destination: input.destination ?? null,
          attention: input.attention ?? null,
        },

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
            accountId: t.accountId ?? null, ref: t.ref ?? null,
          })),
        },
      },
      include: { items: { include: { serialNumbers: true } }, tenders: true, customer: true, editedBy: true, user: true },
    });

    // Aggregate quantities by productId to perform single update for duplicate cart items
    const productQtyMap = new Map<string, number>();
    for (const item of input.items) {
      productQtyMap.set(item.productId, (productQtyMap.get(item.productId) ?? 0) + item.qty);
    }

    // Decrement stock (parallelized inside the transaction)
    await Promise.all(
      Array.from(productQtyMap.entries()).map(async ([productId, qty]) => {
        await tx.product.update({ where: { id: productId }, data: { stock: { decrement: qty } } });
        if (warehouseId) {
          const warehouseStock = warehouseStockMap.get(productId);
          if (warehouseStock) {
            await tx.warehouseStock.update({ where: { id: warehouseStock.id }, data: { qty: { decrement: qty } } });
          } else {
            await tx.warehouseStock.create({ data: { warehouseId, productId, qty: -qty } });
          }
        }
      })
    );

    // Update customer due + record ledger transaction
    if (input.customerId) {
      await salesAccounting.applyCustomerDue(tx, ctx, sale, input.customerId, due, false);
    }

    // Handle Wallet/Advance tenders — customer pays from advance balance
    if (input.customerId) {
      await salesAccounting.applyWalletTenders(tx, ctx, sale.id, input.customerId, input.tenders, false);
    }

    // Assign serials + sync stock (if tracked)
    await salesSerial.assignSerials(
      tx,
      "default",
      warehouseId,
      sale.items,
      input.items.map((i) => ({ productId: i.productId, qty: i.qty, serials: i.serials }))
    );

    return sale;
  }, { timeout: 30000 });

  // Post-process (audit + cache)
  const productIds = [...new Set(input.items.map(item => item.productId))];
  await __postProcess(ctx, raw, productIds);

  return serializeSale(raw);
}
