import { prisma } from "../src/server/db/client";
import { dashboardService } from "../src/server/services/dashboardService";
import { reportsService } from "../src/server/services/reportsService";
import { list as listSales } from "../src/server/services/sales/queries";

async function benchmark() {
  console.log("Starting Benchmark...");

  const mockCtx = { userId: "mock", role: "ADMIN" } as any;

  // 1. Dashboard Metrics
  const startDashboard = performance.now();
  await dashboardService.getMetrics(mockCtx);
  const endDashboard = performance.now();
  console.log(`[Dashboard API] Response Time: ${(endDashboard - startDashboard).toFixed(2)} ms`);

  // 2. Sales List (Pagination & Includes)
  const startSalesList = performance.now();
  await listSales(mockCtx, { limit: 50 });
  const endSalesList = performance.now();
  console.log(`[Sales List API] Response Time: ${(endSalesList - startSalesList).toFixed(2)} ms`);

  // 3. Reports Metrics (replaces Profit & Loss and Sales Summary)
  const startReports = performance.now();
  await reportsService.getMetrics(mockCtx, "2020-01-01", new Date().toISOString(), "All");
  const endReports = performance.now();
  console.log(`[Reports Metrics] Response Time: ${(endReports - startReports).toFixed(2)} ms`);
  console.log("Benchmark Complete.");
  process.exit(0);
}

benchmark().catch(console.error);
