export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";
import { prisma } from "@/server/db/client";
import { cache } from "@/lib/cache";

const respond = apiHandler(async (ctx: Ctx) => {
  // Delete all data for the current shop (delete children first to avoid foreign key errors)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.stockAdjustment.deleteMany(),
    prisma.transferItem.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.purchaseTender.deleteMany(),
    prisma.serialNumber.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.saleTender.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.accountTransfer.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.cashShift.deleteMany(),
    prisma.supplierPayment.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.warehouseStock.deleteMany(),
    prisma.product.deleteMany(),
    prisma.itemList.deleteMany(),
    prisma.series.deleteMany(),
    prisma.model.deleteMany(),
    prisma.productType.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.category.deleteMany(),
    prisma.color.deleteMany(),
    prisma.storage.deleteMany(),
    prisma.ram.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.financialAccount.deleteMany(),
  ]);

  await cache.invalidate("app:*");
  await cache.invalidate("products:storefront:*");

  return { ok: true, message: "All shop data cleared" };
}, "backup:wipe", ["ADMIN"]);

export const DELETE = respond;
export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
