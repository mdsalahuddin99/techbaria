import "server-only";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";

export const dashboardService = {
  async getMetrics(ctx: Ctx) {
    // Determine dates for today and yesterday using shop timezone (assuming 'Asia/Dhaka' for now, or server time)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);

    // Total metrics
    const totalSalesAgg = await prisma.sale.aggregate({
      _sum: { total: true },
      _count: { id: true },
    });

    const todaySalesAgg = await prisma.sale.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: { createdAt: { gte: todayStart } },
    });

    const yestSalesAgg = await prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    });

    const totalRevenue = Number(totalSalesAgg._sum.total || 0);
    const totalOrders = totalSalesAgg._count.id;
    const todayTotal = Number(todaySalesAgg._sum.total || 0);
    const todayOrders = todaySalesAgg._count.id;
    const yestTotal = Number(yestSalesAgg._sum.total || 0);
    const todayDelta = yestTotal ? ((todayTotal - yestTotal) / yestTotal) * 100 : 0;

    // Customer metrics
    const totalCustomers = await prisma.customer.count();
    const vipCount = await prisma.customer.count({ where: { group: "VIP" } });

    // Stock metrics
    const allProducts = await prisma.product.findMany({
      where: { isPublished: true },
      select: { id: true, stock: true, reorderLevel: true, isPublished: true },
    });

    const healthy = allProducts.filter(p => p.stock > (p.reorderLevel ?? 0)).length;
    const low = allProducts.filter(p => p.stock > 0 && p.stock <= (p.reorderLevel ?? 0)).length;
    const outOfStock = allProducts.filter(p => p.stock === 0).length;

    // Last 6 months revenue
    const monthsData: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      monthsData[key] = 0;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await prisma.sale.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { total: true, createdAt: true }
    });

    for (const sale of monthlySales) {
      const key = sale.createdAt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      if (key in monthsData) {
        monthsData[key] += Number(sale.total);
      }
    }

    const monthlyChart = Object.entries(monthsData).map(([month, total]) => ({ month, total }));

    // Top products calculation over the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentSaleItems = await prisma.saleItem.groupBy({
      by: ['productId', 'name'],
      where: { sale: { createdAt: { gte: thirtyDaysAgo } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5
    });

    const topProducts = recentSaleItems.map(item => ({
      name: item.name.length > 20 ? item.name.slice(0, 20) + "…" : item.name,
      qty: item._sum.qty || 0
    }));

    // Stock donut
    const rest = Math.max(0, allProducts.length - healthy - low - outOfStock);
    const stockDonut = [
      { name: "Healthy", value: healthy, color: "#0f766e" },
      { name: "Low Stock", value: low, color: "#f59e0b" },
      { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
      ...(rest > 0 ? [{ name: "Other", value: rest, color: "#ccfbf1" }] : []),
    ].filter((d) => d.value > 0);

    return {
      revenue: {
        total: totalRevenue,
        today: todayTotal,
        delta: todayDelta,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
      },
      customers: {
        total: totalCustomers,
        vip: vipCount,
      },
      stock: {
        healthy,
        low,
        outOfStock,
        total: allProducts.length,
      },
      monthlyChart,
      stockDonut,
      topProducts,
    };
  }
};
