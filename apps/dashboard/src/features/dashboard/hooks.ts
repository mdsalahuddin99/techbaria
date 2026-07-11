import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "./queryKeys";
import { QueryTier } from "@/lib/queryConfig";
import { useAuth } from "@/features/auth";

export interface DashboardMetrics {
  revenue: {
    total: number;
    today: number;
    delta: number;
  };
  orders: {
    total: number;
    today: number;
  };
  customers: {
    total: number;
    vip: number;
  };
  stock: {
    healthy: number;
    low: number;
    outOfStock: number;
    total: number;
  };
  monthlyChart: Array<{ month: string; total: number }>;
  stockDonut: Array<{ name: string; value: number; color: string }>;
  topProducts: Array<{ name: string; qty: number }>;
}

export function useDashboardMetricsQuery() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: async (): Promise<DashboardMetrics> => {
      const res = await fetch("/api/dashboard/metrics");
      if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
      return res.json();
    },
    enabled: status !== "loading" && !!session,
    ...QueryTier.TRANSACTION,
  });
}
