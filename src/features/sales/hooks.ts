import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { salesService } from "@/services";
import { saleKeys, returnKeys } from "./queryKeys";
import type { Sale, SaleReturn } from "@/shared/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

/**
 * Primary sales-list query. `useSalesCacheBridge` (mounted in
 * AppProviders) keeps this cache hot from Zustand during the
 * local-driver phase, so checkout / void / refund propagate instantly
 * to Dashboard, Reports, Returns, Customer history, etc.
 */
export function useSalesQuery() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: saleKeys.list(),
    queryFn: () => salesService.list(),
    enabled: status !== "loading" && !!session,
    ...QueryTier.TRANSACTION,
  });
}

/** Backward-compat shape. Prefer `useSalesQuery`. */
export function useSales() {
  const { data, isLoading, error } = useSalesQuery();
  return {
    data: ((data as any)?.items ?? []) as Sale[],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}

export function useSale(id: string | undefined) {
  const { data } = useSalesQuery();
  const sales = ((data as any)?.items ?? []) as Sale[];
  return {
    data: useMemo(
      () => (id ? sales.find((x) => x.id === id) ?? null : null),
      [sales, id],
    ),
  };
}

export interface SalesFilters {
  search?: string;
  paymentMethod?: string;
}

/** Filtered sales view — derived selector to keep pages thin. */
export function useFilteredSales({ search = "", paymentMethod = "All" }: SalesFilters) {
  const { data } = useSales();
  return useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(
      (s: Sale) =>
        (paymentMethod === "All" || s.paymentMethod === paymentMethod) &&
        (q === "" ||
          s.invoiceNo.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          (s.customerPhone ?? "").toLowerCase().includes(q))
    );
  }, [data, search, paymentMethod]);
}

/** Sales for a specific customer — used by Customers history sheet. */
export function useCustomerSales(customerId: string | null | undefined) {
  const { data } = useSalesQuery();
  return useMemo(
    () =>
      customerId
        ? ((data as any)?.items ?? []).filter((s) => s.customerId === customerId)
        : [],
    [data, customerId],
  );
}

// ---------- Returns ----------

export function useReturnsQuery() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: returnKeys.list(),
    queryFn: async () => [] as SaleReturn[],
    enabled: status !== "loading" && !!session,
    ...QueryTier.TRANSACTION,
  });
}

export function useReturns() {
  const { data, isLoading, error } = useReturnsQuery();
  return {
    data: (data ?? []) as SaleReturn[],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}

export function useReturnActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: saleKeys.all });
    qc.invalidateQueries({ queryKey: returnKeys.all });
  };
  return {
    createReturn: async (payload: Record<string, unknown>) => {
      try {
        const result = await salesService.refund(payload as any);
        invalidate();
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Refund failed";
        toast.error(msg);
        return null;
      }
    },
    deleteReturn: async (id: string) => {
      try {
        await salesService.deleteReturn(id);
        invalidate();
        toast.success("Return deleted");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Delete failed";
        toast.error(msg);
      }
    },
  };
}

/** Service-backed sale mutations (void / refund / delete / update). */
export function useSaleMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: saleKeys.all });
    qc.invalidateQueries({ queryKey: returnKeys.all });
  };
  const voidMutation = useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) =>
      salesService.void(saleId, reason),
    onSuccess: invalidate,
  });
  const refundMutation = useMutation({
    mutationFn: (input: Parameters<typeof salesService.refund>[0]) =>
      salesService.refund(input),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.remove(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      salesService.update(id, input),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  return {
    void: (saleId: string, reason: string) =>
      voidMutation.mutateAsync({ saleId, reason }),
    refund: (input: Parameters<typeof salesService.refund>[0]) =>
      refundMutation.mutateAsync(input),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    update: (id: string, input: Record<string, unknown>) => updateMutation.mutateAsync({ id, input }),
  };
}
