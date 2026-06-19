export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";
import { prisma } from "@/server/db/client";

const respond = apiHandler(async (ctx: Ctx) => {
  // Delete all data for the current shop (delete children first to avoid foreign key errors)
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.notification.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.stockAdjustment.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.transferItem.deleteMany({ where: { transfer: { shopId: ctx.shopId } } }),
    prisma.transfer.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.purchaseTender.deleteMany({ where: { purchase: { shopId: ctx.shopId } } }),
    // First delete serial numbers (they are linked to saleItem and purchaseItem)
    prisma.serialNumber.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.purchaseItem.deleteMany({ where: { purchase: { shopId: ctx.shopId } } }),
    prisma.purchase.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.saleTender.deleteMany({ where: { sale: { shopId: ctx.shopId } } }),
    prisma.saleItem.deleteMany({ where: { sale: { shopId: ctx.shopId } } }),
    prisma.sale.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.accountTransfer.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.expense.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.cashShift.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.supplierPayment.deleteMany({ where: { supplier: { shopId: ctx.shopId } } }),
    prisma.productImage.deleteMany({ where: { product: { shopId: ctx.shopId } } }),
    prisma.productVariant.deleteMany({ where: { product: { shopId: ctx.shopId } } }),
    prisma.warehouseStock.deleteMany({ where: { warehouse: { shopId: ctx.shopId } } }),
    prisma.product.deleteMany({ where: { shopId: ctx.shopId } }),
    // New catalog tables (delete in reverse hierarchy order)
    prisma.subcategorySeries.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.subcategoryModel.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.subcategoryProduct.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.categoryBrand.deleteMany({ where: { shopId: ctx.shopId } }),
    // Existing category
    prisma.category.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.customer.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.supplier.deleteMany({ where: { shopId: ctx.shopId } }),
    prisma.financialAccount.deleteMany({ where: { shopId: ctx.shopId } }),
  ]);

  return { ok: true, message: "All shop data cleared" };
}, "backup:wipe", ["OWNER"]);

export const DELETE = respond;
export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
