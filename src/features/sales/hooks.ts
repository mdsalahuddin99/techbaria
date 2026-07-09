import { useMemo } from "react";
import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
export function useSalesQuery(initialData?: Sale[]) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: saleKeys.list(),
    queryFn: () => salesService.list(),
    initialData: initialData ? { items: initialData, nextCursor: null, hasMore: false } : undefined,
    enabled: status !== "loading" && !!session,
    ...QueryTier.TRANSACTION,
  });
}

export function useInfiniteSalesQuery(filter?: { search?: string; paymentMethod?: string; sortKey?: string; sortDir?: "asc" | "desc" }) {
  const { session, status } = useAuth();
  return useInfiniteQuery({
    queryKey: [...saleKeys.list(), filter],
    queryFn: ({ pageParam }) => salesService.list(filter, pageParam ? { cursor: pageParam } : undefined),
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: status !== "loading" && !!session,
  });
}

/** Backward-compat shape. Prefer `useSalesQuery`. */
export function useSales(initialData?: Sale[]) {
  const { data, isLoading, error } = useSalesQuery(initialData);
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
export function useFilteredSales({ search = "", paymentMethod = "All" }: SalesFilters, initialData?: Sale[]) {
  const { data } = useSales(initialData);
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
  const { session, status } = useAuth();
  const query = useQuery({
    queryKey: [...saleKeys.list(), "customer", customerId],
    queryFn: () => salesService.byCustomer(customerId!),
    enabled: status !== "loading" && !!session && !!customerId,
  });

  return query.data ?? [];
}

// ---------- Returns ----------

export function useReturnsQuery(initialData?: SaleReturn[]) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: returnKeys.list(),
    queryFn: async () => [] as SaleReturn[],
    initialData,
    enabled: status !== "loading" && !!session,
    ...QueryTier.TRANSACTION,
  });
}

export function useReturns(initialData?: SaleReturn[]) {
  const { data, isLoading, error } = useReturnsQuery(initialData);
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
    onSuccess: () => {
      invalidate();
      toast.success("Sale voided");
    },
  });
  const refundMutation = useMutation({
    mutationFn: (input: Parameters<typeof salesService.refund>[0]) =>
      salesService.refund(input),
    onSuccess: () => {
      invalidate();
      toast.success("Refund processed");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Sale deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      salesService.update(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("Sale updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const collectDueMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      salesService.collectDue(id, input),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["customer-ledger"] }); // also refresh customer ledger balances
      toast.success("Due collected successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    void: (saleId: string, reason: string) =>
      voidMutation.mutateAsync({ saleId, reason }),
    refund: (input: Parameters<typeof salesService.refund>[0]) =>
      refundMutation.mutateAsync(input),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    update: (id: string, input: Record<string, unknown>) => updateMutation.mutateAsync({ id, input }),
    collectDue: (id: string, input: Record<string, unknown>) => collectDueMutation.mutateAsync({ id, input }),
  };
}
