import { reportsService } from "@/server/services/reportsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const d = new Date();
  const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 29);
  const monthAgoStr = new Date(monthAgo.getTime() - monthAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  
  const [metrics, inventory, dues, expensesDetailed] = await Promise.all([
    reportsService.getMetrics(ctx, monthAgoStr, todayStr, "All"),
    reportsService.getInventoryMetrics(ctx, monthAgoStr, todayStr),
    reportsService.getDuesMetrics(ctx),
    reportsService.getExpensesDetailed(ctx, monthAgoStr, todayStr),
  ]);

  return (
    <ReportsClient 
      initialMetrics={metrics}
      initialInventory={inventory}
      initialDues={dues}
      initialExpensesDetailed={expensesDetailed}
      initialFromDate={monthAgoStr}
      initialToDate={todayStr}
    />
  );
}
