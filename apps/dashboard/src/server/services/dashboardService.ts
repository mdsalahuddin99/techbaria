import "server-only";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { cache } from "@/lib/cache";

export const dashboardService = {
  async getMetrics(ctx: Ctx, period: "daily" | "weekly" | "monthly" | "all" = "all") {
    // Cache the metrics for 1 minute to avoid heavy DB queries on every load
    return cache.fetch(`app:dashboard:metrics:${ctx.userId}:${period}`, 60, async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 86400000);

      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      let startDate: Date | undefined;
      if (period === "daily") startDate = todayStart;
      else if (period === "weekly") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (period === "monthly") startDate = thirtyDaysAgo;

      const [
        totalSalesAgg,
        todaySalesAgg,
        yestSalesAgg,
        totalCustomers,
        vipCount,
        recentSaleItems,
        rawStockStats,
        totalProductsCount,
        totalCostRes,
        todayCostRes,
        yestCostRes
      ] = await Promise.all([
        prisma.sale.aggregate({ _sum: { total: true }, _count: { id: true }, where: startDate ? { createdAt: { gte: startDate } } : undefined }),
        prisma.sale.aggregate({ _sum: { total: true }, _count: { id: true }, where: { createdAt: { gte: todayStart } } }),
        prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        prisma.customer.count(),
        prisma.customer.count({ where: { group: "VIP" } }),
        prisma.$queryRaw<Array<{ name: string, qty: number }>>`
          SELECT si.name, SUM(si.qty)::int as qty 
          FROM "SaleItem" si 
          JOIN "Sale" s ON si."saleId" = s.id 
          WHERE s."createdAt" >= ${thirtyDaysAgo} 
          GROUP BY si.name 
          ORDER BY qty DESC 
          LIMIT 5
        `,
        prisma.$queryRaw<Array<{ status: string, count: number }>>`
          SELECT 
            CASE 
              WHEN stock <= 0 THEN 'outOfStock'
              WHEN stock > 0 AND stock <= "reorderLevel" THEN 'low'
              ELSE 'healthy'
            END as status,
            COUNT(*)::int as count
          FROM "Product"
          GROUP BY 
            CASE 
              WHEN stock <= 0 THEN 'outOfStock'
              WHEN stock > 0 AND stock <= "reorderLevel" THEN 'low'
              ELSE 'healthy'
            END
        `,
        prisma.product.count(),
        startDate 
          ? prisma.$queryRaw<Array<{ totalCost: number }>>`SELECT COALESCE(SUM(si.qty * si.cost), 0)::float as "totalCost" FROM "SaleItem" si JOIN "Sale" s ON si."saleId" = s.id WHERE s."createdAt" >= ${startDate}`
          : prisma.$queryRaw<Array<{ totalCost: number }>>`SELECT COALESCE(SUM(si.qty * si.cost), 0)::float as "totalCost" FROM "SaleItem" si JOIN "Sale" s ON si."saleId" = s.id`,
        prisma.$queryRaw<Array<{ totalCost: number }>>`SELECT COALESCE(SUM(si.qty * si.cost), 0)::float as "totalCost" FROM "SaleItem" si JOIN "Sale" s ON si."saleId" = s.id WHERE s."createdAt" >= ${todayStart}`,
        prisma.$queryRaw<Array<{ totalCost: number }>>`SELECT COALESCE(SUM(si.qty * si.cost), 0)::float as "totalCost" FROM "SaleItem" si JOIN "Sale" s ON si."saleId" = s.id WHERE s."createdAt" >= ${yesterdayStart} AND s."createdAt" < ${todayStart}`
      ]);

      const totalRevenue = Number(totalSalesAgg._sum.total || 0);
      const totalCost = Number(totalCostRes[0]?.totalCost || 0);
      const totalProfit = totalRevenue - totalCost;

      const totalOrders = totalSalesAgg._count.id;
      
      const todayTotal = Number(todaySalesAgg._sum.total || 0);
      const todayCost = Number(todayCostRes[0]?.totalCost || 0);
      const todayProfit = todayTotal - todayCost;

      const todayOrders = todaySalesAgg._count.id;
      
      const yestTotal = Number(yestSalesAgg._sum.total || 0);
      const yestCost = Number(yestCostRes[0]?.totalCost || 0);
      const yestProfit = yestTotal - yestCost;
      
      const todayDelta = yestTotal ? ((todayTotal - yestTotal) / yestTotal) * 100 : 0;
      const profitDelta = yestProfit ? ((todayProfit - yestProfit) / Math.abs(yestProfit)) * 100 : 0;

      let healthy = 0, low = 0, outOfStock = 0;
      rawStockStats.forEach(s => {
        if (s.status === 'healthy') healthy = Number(s.count);
        if (s.status === 'low') low = Number(s.count);
        if (s.status === 'outOfStock') outOfStock = Number(s.count);
      });

      const topProducts = recentSaleItems.map(item => ({
        name: item.name.length > 20 ? item.name.slice(0, 20) + "…" : item.name,
        qty: Number(item.qty || 0)
      }));

      const rest = Math.max(0, totalProductsCount - healthy - low - outOfStock);
      const stockDonut = [
        { name: "Healthy", value: healthy, color: "#0f766e" },
        { name: "Low Stock", value: low, color: "#f59e0b" },
        { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
        ...(rest > 0 ? [{ name: "Other", value: rest, color: "#ccfbf1" }] : []),
      ].filter((d) => d.value > 0);

      return {
        revenue: { total: totalRevenue, today: todayTotal, delta: todayDelta },
        profit: { total: totalProfit, today: todayProfit, delta: profitDelta },
        orders: { total: totalOrders, today: todayOrders },
        customers: { total: totalCustomers, vip: vipCount },
        stock: { healthy, low, outOfStock, total: totalProductsCount },
        stockDonut,
        topProducts,
      };
    });
  }
};

