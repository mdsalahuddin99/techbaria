import "server-only";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { Prisma } from "@prisma/client";

export const reportsService = {
  async getMetrics(ctx: Ctx, from: string, to: string, paymentMethod: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const completedSaleWhere: Prisma.SaleWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      status: "COMPLETED",
    };

    if (paymentMethod !== "All") {
      completedSaleWhere.tenders = {
        some: {
          type: paymentMethod === "Cash" ? "CASH" 
              : paymentMethod === "Card" ? "CARD" 
              : "BKASH"
        }
      };
    }

    const refundedSaleWhere: Prisma.SaleWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      status: "REFUNDED",
    };

    const pmSql = paymentMethod !== "All" 
      ? Prisma.sql`AND EXISTS(SELECT 1 FROM "SaleTender" st WHERE st."saleId" = s.id AND st.type = ${paymentMethod === "Cash" ? "CASH" : paymentMethod === "Card" ? "CARD" : "BKASH"})` 
      : Prisma.empty;

    // Run independent queries in parallel to drastically improve loading speed
    const [
      completedSalesAgg,
      refundedSalesAgg,
      purchasesAgg,
      rawStockVal,
      rawCogs,
      expensesAgg,
      rawTopProducts,
      salesList,
      expensesByCategory
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: completedSaleWhere,
        _sum: { total: true, paid: true, due: true, discount: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: refundedSaleWhere,
        _sum: { total: true, paid: true, due: true, discount: true },
        _count: { id: true },
      }),
      prisma.purchase.aggregate({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _sum: { total: true, paid: true, due: true, discount: true, extraCost: true },
      }),
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT SUM(stock * COALESCE(cost, 0)) as total 
        FROM "Product" 
        WHERE "isPublished" = true AND stock > 0
      `,
      prisma.$queryRaw<Array<{ cogs: number }>>`
        SELECT SUM(si.qty * COALESCE(si.cost, 0)) as cogs
        FROM "SaleItem" si
        JOIN "Sale" s ON si."saleId" = s.id
        WHERE s."createdAt" >= ${fromDate} AND s."createdAt" <= ${toDate}
        AND s.status = 'COMPLETED'
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
        AND s.status = 'COMPLETED'
        ${pmSql}
        GROUP BY si.name
        ORDER BY qty DESC
        LIMIT 10
      `,
      prisma.sale.findMany({
        where: completedSaleWhere,
        select: { createdAt: true, total: true, tenders: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { date: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const totalRevenue = Number(completedSalesAgg._sum.total || 0);
    const txnCount = completedSalesAgg._count.id;
    const aov = txnCount > 0 ? totalRevenue / txnCount : 0;
    const cogs = Number(rawCogs[0]?.cogs || 0);
    const expenseTotal = Number(expensesAgg._sum.amount || 0);
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - expenseTotal;

    const openingStock = Number(rawStockVal[0]?.total || 0);

    const totalPurchase = Number(purchasesAgg._sum.total || 0);
    const totalPurchaseTax = 0;
    const totalOtherChargesPurchase = Number(purchasesAgg._sum.extraCost || 0);
    const totalDiscountPurchase = Number(purchasesAgg._sum.discount || 0);
    const paidPurchase = Number(purchasesAgg._sum.paid || 0);
    const duePurchase = Number(purchasesAgg._sum.due || 0);

    const totalPurchaseReturn = 0;
    const totalPurchaseReturnTax = 0;
    const totalOtherChargesPurchaseReturn = 0;
    const totalDiscountPurchaseReturn = 0;
    const paidPurchaseReturn = 0;
    const duePurchaseReturn = 0;

    const salesBeforeTax = Number(completedSalesAgg._sum.total || 0);
    const totalSalesTax = 0;
    const totalOtherChargesSales = 0;
    const totalDiscountSales = Number(completedSalesAgg._sum.discount || 0);
    const couponDiscount = 0;
    const totalSales = Number(completedSalesAgg._sum.total || 0);
    const paidSales = Number(completedSalesAgg._sum.paid || 0);
    const dueSales = Number(completedSalesAgg._sum.due || 0);

    const totalSalesReturn = Number(refundedSalesAgg._sum.total || 0);
    const totalSalesReturnTax = 0;
    const totalOtherChargesSalesReturn = 0;
    const couponDiscountSalesReturn = 0;
    const totalDiscountSalesReturn = Number(refundedSalesAgg._sum.discount || 0);
    const returnTotal = Number(refundedSalesAgg._sum.total || 0);
    const paidSalesReturn = Number(refundedSalesAgg._sum.paid || 0);
    const dueSalesReturn = Number(refundedSalesAgg._sum.due || 0);

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
      openingStock,
      totalPurchase,
      totalPurchaseTax,
      totalOtherChargesPurchase,
      totalDiscountPurchase,
      paidPurchase,
      duePurchase,
      totalPurchaseReturn,
      totalPurchaseReturnTax,
      totalOtherChargesPurchaseReturn,
      totalDiscountPurchaseReturn,
      paidPurchaseReturn,
      duePurchaseReturn,
      salesBeforeTax,
      totalSalesTax,
      totalOtherChargesSales,
      totalDiscountSales,
      couponDiscount,
      totalSales,
      paidSales,
      dueSales,
      totalSalesReturn,
      totalSalesReturnTax,
      totalOtherChargesSalesReturn,
      couponDiscountSalesReturn,
      totalDiscountSalesReturn,
      returnTotal,
      paidSalesReturn,
      dueSalesReturn,
    };
  },

  async getInventoryMetrics(ctx: Ctx, from?: string, to?: string, onlineOnly?: boolean) {
    const pubCondition = onlineOnly ? Prisma.sql`AND "isPublished" = true` : Prisma.empty;

    const rawStockVal = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT SUM(stock * (CASE WHEN COALESCE(cost, 0) > 0 THEN cost ELSE COALESCE(price, 0) END)) as total 
      FROM "Product" 
      WHERE stock > 0 ${pubCondition}
    `;
    const stockValue = Number(rawStockVal[0]?.total || 0);

    const rawLowStock = await prisma.$queryRaw<Array<{ id: string, name: string, stock: number, minStock: number }>>`
      SELECT id, name, stock, "reorderLevel" as "minStock"
      FROM "Product"
      WHERE stock > 0 AND stock <= "reorderLevel" ${pubCondition}
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
      SELECT id, name, stock, unit, 
             (stock * (CASE WHEN COALESCE(cost, 0) > 0 THEN cost ELSE COALESCE(price, 0) END)) as value,
             (SELECT name FROM "Category" WHERE id = "categoryId") as category
      FROM "Product"
      WHERE stock > 0 ${pubCondition}
        AND id NOT IN (
          SELECT p.id 
          FROM "Product" p
          JOIN "SaleItem" si ON p.id = si."productId"
          JOIN "Sale" s ON s.id = si."saleId"
          WHERE s.status = 'COMPLETED' 
            AND s."createdAt" >= ${filterDate}
        )
      ORDER BY stock DESC
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
  },

  async getDuesMetrics(ctx: Ctx) {
    const [customers, suppliers] = await Promise.all([
      prisma.customer.findMany({
        where: { due: { gt: 0 } },
        select: { id: true, name: true, phone: true, due: true },
        orderBy: { due: "desc" },
      }),
      prisma.supplier.findMany({
        where: { payable: { gt: 0 } },
        select: { id: true, name: true, phone: true, payable: true },
        orderBy: { payable: "desc" },
      }),
    ]);

    const totalCustomerDue = customers.reduce((sum, c) => sum + Number(c.due), 0);
    const totalSupplierPayable = suppliers.reduce((sum, s) => sum + Number(s.payable), 0);

    return {
      customers: customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "N/A",
        due: Number(c.due),
      })),
      suppliers: suppliers.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone || "N/A",
        payable: Number(s.payable),
      })),
      totalCustomerDue,
      totalSupplierPayable,
    };
  },

  async getExpensesDetailed(ctx: Ctx, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const [expenses, expensesByCategory] = await Promise.all([
      prisma.expense.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        orderBy: { date: "desc" },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { date: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const breakdown = expensesByCategory.map(eb => {
      const amount = Number(eb._sum.amount || 0);
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return {
        category: eb.category,
        count: eb._count.id,
        amount,
        percentage,
      };
    }).sort((a, b) => b.amount - a.amount);

    return {
      expenses: expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        notes: e.notes || "",
      })),
      breakdown,
      totalExpense,
    };
  }
}

