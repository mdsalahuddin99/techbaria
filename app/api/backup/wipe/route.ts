export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";
import { prisma } from "@/server/db/client";

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
    prisma.subcategorySeries.deleteMany(),
    prisma.subcategoryModel.deleteMany(),
    prisma.subcategoryProduct.deleteMany(),
    prisma.categoryBrand.deleteMany(),
    prisma.category.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.financialAccount.deleteMany(),
  ]);

  return { ok: true, message: "All shop data cleared" };
}, "backup:wipe", ["OWNER"]);

export const DELETE = respond;
export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
