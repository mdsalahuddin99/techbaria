import { useQuery } from "@tanstack/react-query";
import { reportKeys } from "./queryKeys";
import { QueryTier } from "@/lib/queryConfig";
import { useAuth } from "@/features/auth";

export interface ReportRange {
  from: string;
  to: string;
  paymentMethod?: string;
}

export interface ReportsMetrics {
  totalRevenue: number;
  txnCount: number;
  aov: number;
  cogs: number;
  expenseTotal: number;
  grossProfit: number;
  netProfit: number;
  trend: Array<{ date: string; total: number }>;
  byMethod: Array<{ name: string; value: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  expensesList: Array<{ category: string; total: number; count: number }>;
}

export function useReportsMetricsQuery({ from, to, paymentMethod = "All" }: ReportRange) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: reportKeys.metrics(from, to, paymentMethod),
    queryFn: async (): Promise<ReportsMetrics> => {
      const params = new URLSearchParams({ from, to, paymentMethod });
      const res = await fetch(`/api/reports/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports metrics");
      return res.json();
    },
    enabled: status !== "loading" && !!session && !!from && !!to,
    ...QueryTier.TRANSACTION,
  });
}

export interface InventoryMetrics {
  stockValue: number;
  lowStock: Array<{ id: string; name: string; stock: number; minStock: number }>;
  deadStock: Array<{ id: string; name: string; category: string; stock: number; unit: string; value: number }>;
}

export function useInventoryMetricsQuery({ from, to }: { from?: string; to?: string } = {}) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: reportKeys.inventoryMetrics(from, to),
    queryFn: async (): Promise<InventoryMetrics> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const res = await fetch(`/api/inventory/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inventory metrics");
      return res.json();
    },
    enabled: status !== "loading" && !!session,
    ...QueryTier.TRANSACTION,
  });
}
