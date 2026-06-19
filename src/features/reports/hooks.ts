import { useMemo } from "react";
import { useProductsQuery } from "@/features/products/hooks";
import { useSalesQuery } from "@/features/sales/hooks";
import { useExpensesQuery } from "@/features/expenses/hooks";
import { Sale } from "@/shared/lib/types";

export interface ReportRange {
  from: string;
  to: string;
  paymentMethod?: string;
}

/** Pre-computed sales aggregations for the Reports page. */
export function useSalesReport({ from, to, paymentMethod = "All" }: ReportRange) {
  const { data: salesData } = useSalesQuery();
  const sales = ((salesData as any)?.items ?? []) as any[];
  const { data: productsData } = useProductsQuery();
  const products = ((productsData as any)?.items ?? []) as any[];
  const { data: expensesData } = useExpensesQuery();
  const expenses = ((expensesData as any)?.items ?? []) as any[];

  return useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59);

    const filteredSales: Sale[] = sales.filter((s) => {
      const d = new Date(s.date);
      return d >= fromDate && d <= toDate && (paymentMethod === "All" || s.paymentMethod === paymentMethod);
    });

    const totalRevenue = filteredSales.reduce((s, x) => s + x.total, 0);
    const txnCount = filteredSales.length;
    const aov = txnCount ? totalRevenue / txnCount : 0;

    const cogs = filteredSales.reduce(
      (sum, s) =>
        sum +
        s.items.reduce((acc, i) => {
          const p = products.find((pp) => pp.id === i.productId);
          return acc + (p?.costPrice ?? 0) * i.qty;
        }, 0),
      0
    );

    const filteredExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= fromDate && d <= toDate;
    });
    const expenseTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    return {
      filteredSales,
      filteredExpenses,
      totalRevenue,
      txnCount,
      aov,
      cogs,
      expenseTotal,
      grossProfit: totalRevenue - cogs,
      netProfit: totalRevenue - cogs - expenseTotal,
    };
  }, [sales, products, expenses, from, to, paymentMethod]);
}
