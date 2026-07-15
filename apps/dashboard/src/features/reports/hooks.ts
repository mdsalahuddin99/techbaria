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
  openingStock: number;
  totalPurchase: number;
  totalPurchaseTax: number;
  totalOtherChargesPurchase: number;
  totalDiscountPurchase: number;
  paidPurchase: number;
  duePurchase: number;
  totalPurchaseReturn: number;
  totalPurchaseReturnTax: number;
  totalOtherChargesPurchaseReturn: number;
  totalDiscountPurchaseReturn: number;
  paidPurchaseReturn: number;
  duePurchaseReturn: number;
  salesBeforeTax: number;
  totalSalesTax: number;
  totalOtherChargesSales: number;
  totalDiscountSales: number;
  couponDiscount: number;
  totalSales: number;
  paidSales: number;
  dueSales: number;
  totalSalesReturn: number;
  totalSalesReturnTax: number;
  totalOtherChargesSalesReturn: number;
  couponDiscountSalesReturn: number;
  totalDiscountSalesReturn: number;
  returnTotal: number;
  paidSalesReturn: number;
  dueSalesReturn: number;
}

export function useReportsMetricsQuery(
  { from, to, paymentMethod = "All" }: { from?: string; to?: string; paymentMethod?: string } = {},
  initialData?: any
) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: reportKeys.metrics(from!, to!, paymentMethod!),
    queryFn: async (): Promise<ReportsMetrics> => {
      const params = new URLSearchParams({ from: from!, to: to!, paymentMethod: paymentMethod! });
      const res = await fetch(`/api/reports/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports metrics");
      return res.json();
    },
    enabled: status !== "loading" && !!session && !!from && !!to,
    initialData,
    ...QueryTier.TRANSACTION,
  });
}

export interface InventoryMetrics {
  stockValue: number;
  lowStock: Array<{ id: string; name: string; stock: number; minStock: number }>;
  deadStock: Array<{ id: string; name: string; category: string; stock: number; unit: string; value: number }>;
}

export function useInventoryMetricsQuery(
  { from, to, onlineOnly }: { from?: string; to?: string; onlineOnly?: boolean } = {},
  initialData?: any
) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: [...reportKeys.inventoryMetrics(from, to), onlineOnly],
    queryFn: async (): Promise<InventoryMetrics> => {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (onlineOnly) params.append("onlineOnly", "true");
      const res = await fetch(`/api/inventory/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inventory metrics");
      return res.json();
    },
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.TRANSACTION,
  });
}

export interface DuesMetrics {
  customers: Array<{ id: string; name: string; phone: string; due: number }>;
  suppliers: Array<{ id: string; name: string; phone: string; payable: number }>;
  totalCustomerDue: number;
  totalSupplierPayable: number;
}

export function useDuesMetricsQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: ["reports", "dues"],
    queryFn: async (): Promise<DuesMetrics> => {
      const res = await fetch("/api/reports/dues");
      if (!res.ok) throw new Error("Failed to fetch dues metrics");
      return res.json();
    },
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.TRANSACTION,
  });
}

export interface ExpensesDetailed {
  expenses: Array<{ id: string; category: string; amount: number; date: string; notes: string }>;
  breakdown: Array<{ category: string; count: number; amount: number; percentage: number }>;
  totalExpense: number;
}

export function useExpensesDetailedQuery(
  { from, to }: { from: string; to: string },
  initialData?: any
) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: ["reports", "expenses", from, to],
    queryFn: async (): Promise<ExpensesDetailed> => {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch detailed expenses");
      return res.json();
    },
    enabled: status !== "loading" && !!session && !!from && !!to,
    initialData,
    ...QueryTier.TRANSACTION,
  });
}
