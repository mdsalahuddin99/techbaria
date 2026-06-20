export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";
import { prisma } from "@/server/db/client";

/**
 * Exports ALL shop data as a single JSON object.
 * Includes all major entities: products, categories, sales, purchases,
 * customers, suppliers, accounts, expenses, etc.
 */
export const GET = apiHandler(async (ctx: Ctx) => {
  const shopId = ctx.shopId;

  const [
    categories,
    products,
    customers,
    suppliers,
    accounts,
    sales,
    purchases,
    expenses,
  ] = await Promise.all([
    prisma.category.findMany(),
    prisma.product.findMany(),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.financialAccount.findMany(),
    prisma.sale.findMany({
      include: { items: true, tenders: true },
    }),
    prisma.purchase.findMany({
      include: { items: true, tenders: true },
    }),
    prisma.expense.findMany(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    shopId,
    stats: {
      categories: categories.length,
      products: products.length,
      customers: customers.length,
      suppliers: suppliers.length,
      accounts: accounts.length,
      sales: sales.length,
      purchases: purchases.length,
      expenses: expenses.length,
    },
    data: {
      categories,
      products,
      customers,
      suppliers,
      accounts,
      sales,
      purchases,
      expenses,
    },
  };

  return backup;
}, "backup:export", ["OWNER"]);
