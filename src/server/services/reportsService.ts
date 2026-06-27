import "server-only";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import type { Prisma } from "@prisma/client";

export const reportsService = {
  async getMetrics(ctx: Ctx, from: string, to: string, paymentMethod: string) {
    // Parse dates
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Sales filters
    const saleWhere: Prisma.SaleWhereInput = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
      status: { notIn: ["HELD", "VOIDED"] },
    };

    if (paymentMethod !== "All") {
      saleWhere.tenders = {
        some: {
          type: paymentMethod === "Cash" ? "CASH" 
              : paymentMethod === "Card" ? "CARD" 
              : paymentMethod === "Mobile Banking" ? "BKASH" // or NAGAD, ROCKET but let's stick to BKASH for now as per schema logic
              : undefined
        }
      };
    }

    // P&L metrics
    const salesAgg = await prisma.sale.aggregate({
      where: saleWhere,
      _sum: { total: true },
      _count: { id: true },
    });

    const totalRevenue = Number(salesAgg._sum.total || 0);
    const txnCount = salesAgg._count.id;
    const aov = txnCount > 0 ? totalRevenue / txnCount : 0;

    // COGS calculation
    // Since prisma doesn't support complex joins in sum, we need to query SaleItems with their costs.
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: saleWhere },
      select: { qty: true, cost: true, price: true, productId: true, name: true, sale: { select: { createdAt: true } } },
    });

    const cogs = saleItems.reduce((sum, item) => sum + (Number(item.cost || 0) * item.qty), 0);

    // Expenses
    const expensesAgg = await prisma.expense.aggregate({
      where: {
        date: { gte: fromDate, lte: toDate }
      },
      _sum: { amount: true },
    });
    const expenseTotal = Number(expensesAgg._sum.amount || 0);

    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - expenseTotal;

    // Daily Trend
    const trendMap: Record<string, number> = {};
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      trendMap[d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })] = 0;
    }

    const salesList = await prisma.sale.findMany({
      where: saleWhere,
      select: { createdAt: true, total: true, tenders: true },
    });

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

    // Top Products
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    saleItems.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.productId].qty += item.qty;
      productSalesMap[item.productId].revenue += (item.qty * Number(item.price));
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Expenses by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
      _count: { id: true }
    });

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

  async getInventoryMetrics(ctx: Ctx) {
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, stock: true, cost: true, price: true, reorderLevel: true, category: { select: { name: true } }, unit: true }
    });

    const stockValue = products.reduce((sum, p) => sum + (p.stock * Number(p.cost || 0)), 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.reorderLevel
    }));

    // Dead stock - no sales in 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentSaleItems = await prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: ninetyDaysAgo } } },
      select: { productId: true },
      distinct: ['productId']
    });

    const soldProductIds = new Set(recentSaleItems.map(i => i.productId));
    
    const deadStock = products
      .filter(p => !soldProductIds.has(p.id) && p.stock > 0)
      .map(p => ({
        id: p.id,
        name: p.name,
        category: p.category?.name || "Uncategorized",
        stock: p.stock,
        unit: p.unit,
        value: p.stock * Number(p.cost || 0)
      }));

    return {
      stockValue,
      lowStock,
      deadStock,
    };
  }
};
