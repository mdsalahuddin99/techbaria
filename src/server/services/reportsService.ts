import "server-only";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { Prisma } from "@prisma/client";

export const reportsService = {
  async getMetrics(ctx: Ctx, from: string, to: string, paymentMethod: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const saleWhere: Prisma.SaleWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      status: { notIn: ["HELD", "VOIDED"] },
    };

    if (paymentMethod !== "All") {
      saleWhere.tenders = {
        some: {
          type: paymentMethod === "Cash" ? "CASH" 
              : paymentMethod === "Card" ? "CARD" 
              : "BKASH"
        }
      };
    }

    const pmSql = paymentMethod !== "All" 
      ? Prisma.sql`AND EXISTS(SELECT 1 FROM "SaleTender" st WHERE st."saleId" = s.id AND st.type = ${paymentMethod === "Cash" ? "CASH" : paymentMethod === "Card" ? "CARD" : "BKASH"})` 
      : Prisma.empty;

    // Run independent queries in parallel to drastically improve loading speed
    const [
      salesAgg,
      rawCogs,
      expensesAgg,
      rawTopProducts,
      salesList,
      expensesByCategory
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: saleWhere,
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.$queryRaw<Array<{ cogs: number }>>`
        SELECT SUM(si.qty * COALESCE(si.cost, 0)) as cogs
        FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        WHERE s."createdAt" >= ${fromDate} AND s."createdAt" <= ${toDate}
        AND s.status NOT IN ('HELD', 'VOIDED')
        ${pmSql}
      `,
      prisma.expense.aggregate({
        where: { date: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
      }),
      prisma.$queryRaw<Array<{ name: string, qty: number, revenue: number }>>`
        SELECT si.name, SUM(si.qty) as qty, SUM(si.qty * si.price) as revenue
        FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        WHERE s."createdAt" >= ${fromDate} AND s."createdAt" <= ${toDate}
        AND s.status NOT IN ('HELD', 'VOIDED')
        ${pmSql}
        GROUP BY si.name
        ORDER BY qty DESC
        LIMIT 10
      `,
      prisma.sale.findMany({
        where: saleWhere,
        select: { createdAt: true, total: true, tenders: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { date: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const totalRevenue = Number(salesAgg._sum.total || 0);
    const txnCount = salesAgg._count.id;
    const aov = txnCount > 0 ? totalRevenue / txnCount : 0;
    const cogs = Number(rawCogs[0]?.cogs || 0);
    const expenseTotal = Number(expensesAgg._sum.amount || 0);
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - expenseTotal;

    const topProducts = rawTopProducts.map(p => ({
      name: p.name,
      qty: Number(p.qty),
      revenue: Number(p.revenue),
    }));

    const trendMap: Record<string, number> = {};
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      trendMap[d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })] = 0;
    }

    const byMethodMap: Record<string, number> = {};
    salesList.forEach(sale => {
      const dateKey = sale.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (dateKey in trendMap) {
        trendMap[dateKey] += Number(sale.total);
      }
      
      const methodStr = sale.tenders?.[0]?.type === "CASH" ? "Cash" 
                      : sale.tenders?.[0]?.type === "CARD" ? "Card" 
                      : (sale.tenders?.[0]?.type === "BKASH" || sale.tenders?.[0]?.type === "NAGAD") ? "Mobile Banking" 
                      : "Other";
      byMethodMap[methodStr] = (byMethodMap[methodStr] || 0) + Number(sale.total);
    });

    const trend = Object.entries(trendMap).map(([date, total]) => ({ date, total }));
    const byMethod = Object.entries(byMethodMap).map(([name, value]) => ({ name, value }));

    const expensesList = expensesByCategory.map(e => ({
      category: e.category,
      total: Number(e._sum.amount || 0),
      count: e._count.id
    }));

    return {
      totalRevenue,
      txnCount,
      aov,
      cogs,
      expenseTotal,
      grossProfit,
      netProfit,
      trend,
      byMethod,
      topProducts,
      expensesList,
    };
  },

  async getInventoryMetrics(ctx: Ctx, from?: string, to?: string) {
    const rawStockVal = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT SUM(stock * COALESCE(cost, 0)) as total 
      FROM "Product" 
      WHERE "isPublished" = true AND stock > 0
    `;
    const stockValue = Number(rawStockVal[0]?.total || 0);

    const rawLowStock = await prisma.$queryRaw<Array<{ id: string, name: string, stock: number, minStock: number }>>`
      SELECT id, name, stock, "reorderLevel" as "minStock"
      FROM "Product"
      WHERE "isPublished" = true AND stock > 0 AND stock <= "reorderLevel"
      ORDER BY stock ASC
      LIMIT 100
    `;
    const lowStock = rawLowStock.map(p => ({
      id: p.id,
      name: p.name,
      stock: Number(p.stock),
      minStock: Number(p.minStock),
    }));

    let filterDate = new Date();
    filterDate.setDate(filterDate.getDate() - 90);
    
    if (from) {
      filterDate = new Date(from);
    }
    
    let toDate = new Date();
    if (to) {
      toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
    }

    const rawDeadStock = await prisma.$queryRaw<Array<{ id: string, name: string, category: string, stock: number, unit: string, value: number }>>`
      SELECT p.id, p.name, c.name as category, p.stock, p.unit, (p.stock * COALESCE(p.cost, 0)) as value
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p."isPublished" = true AND p.stock > 0
      AND p.id NOT IN (
        SELECT "productId" FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        WHERE s."createdAt" >= ${filterDate} AND s."createdAt" <= ${toDate}
      )
      ORDER BY value DESC
      LIMIT 100
    `;
    
    const deadStock = rawDeadStock.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || "Uncategorized",
      stock: Number(p.stock),
      unit: p.unit || "",
      value: Number(p.value),
    }));

    return {
      stockValue,
      lowStock,
      deadStock,
    };
  }
};

