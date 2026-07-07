import { useMemo } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasesService } from "@/services";
import type { PurchaseItem, PurchaseOrder, PurchaseStatus, RestockOrder } from "@/shared/lib/types";
import type { PaymentMethod } from "@/features/sales/types";
import { purchaseKeys, restockKeys } from "./queryKeys";
import { productKeys } from "@/features/products/queryKeys";
import { supplierKeys } from "@/features/suppliers/queryKeys";
import { accountKeys, ledgerKeys } from "@/features/accounts/queryKeys";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

// ---------- Primary queries (fed by useProcurementCacheBridge) ----------

export function usePurchasesQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: purchaseKeys.list(),
    queryFn: () => purchasesService.list(),
    enabled: status !== "loading" && !!session,
    initialData: initialData ? { items: initialData, nextCursor: null, hasMore: false } : undefined,
    ...QueryTier.MASTER_DATA,
  });
}

export function useInfinitePurchasesQuery(
  filter?: { search?: string; status?: string; sortKey?: string; sortDir?: "asc" | "desc" },
  initialData?: any
) {
  const { session, status } = useAuth();
  return useInfiniteQuery({
    queryKey: [...purchaseKeys.list(), filter],
    queryFn: ({ pageParam }) => purchasesService.list(filter, pageParam ? { cursor: pageParam } : undefined),
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: status !== "loading" && !!session,
    initialData,
  });
}

export function useRestocksQuery() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: restockKeys.list(),
    queryFn: () => purchasesService.listRestocks(),
    enabled: status !== "loading" && !!session,
    ...QueryTier.MASTER_DATA,
  });
}

// ---------- Backward-compat reader hooks ----------

export function usePurchases(initialData?: PurchaseOrder[]): PurchaseOrder[] {
  const { data } = usePurchasesQuery(initialData);
  return ((data as any)?.items ?? []) as PurchaseOrder[];
}

export function useRestocks(): RestockOrder[] {
  const { data } = useRestocksQuery();
  return ((data as any)?.items ?? []) as RestockOrder[];
}

// ---------- Shared invalidator ----------

function invalidateProcurement(qc: ReturnType<typeof useQueryClient>) {
  // Critical: purchases & products must refresh immediately (stock changed)
  qc.invalidateQueries({ queryKey: purchaseKeys.all });
  qc.invalidateQueries({ queryKey: restockKeys.all });
  qc.invalidateQueries({ queryKey: productKeys.all });
  // Non-critical: mark stale but don't trigger an immediate network fetch.
  // These will be re-fetched lazily the next time their page is visited.
  qc.invalidateQueries({ queryKey: supplierKeys.all, refetchType: "none" });
  qc.invalidateQueries({ queryKey: accountKeys.all, refetchType: "none" });
  qc.invalidateQueries({ queryKey: ledgerKeys.all, refetchType: "none" });
}

// ---------- Mutations ----------

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      supplierId: string;
      warehouseId?: string;
      items: Array<Omit<PurchaseItem, "receivedQty">>;
      amountPaid: number;
      status: PurchaseStatus;
      expectedDate?: string;
      note?: string;
      tenders?: Array<{ type: string; amount: number; accountId?: string; ref?: string }>;
    }) => purchasesService.create(input),
    onSuccess: () => invalidateProcurement(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReceivePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, receivedQuantities }: { id: string; receivedQuantities: Record<string, number> }) =>
      purchasesService.receive(id, receivedQuantities),
    onSuccess: () => invalidateProcurement(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddPurchasePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payment,
    }: {
      id: string;
      payment: { amount: number; method: PaymentMethod; accountId?: string; note?: string };
    }) => purchasesService.addPayment(id, payment),
    onSuccess: () => invalidateProcurement(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesService.remove(id),
    onSuccess: () => invalidateProcurement(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      purchasesService.update(id, input),
    onSuccess: () => invalidateProcurement(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Backward-compat action bags (now go through mutations) ----------

export function usePurchaseActions() {
  const createM = useCreatePurchase();
  const receiveM = useReceivePurchase();
  const payM = useAddPurchasePayment();
  const delM = useDeletePurchase();
  const updateM = useUpdatePurchase();
  return {
    create: createM.mutateAsync,
    receive: (id: string, receivedQuantities: Record<string, number>) =>
      receiveM.mutateAsync({ id, receivedQuantities }),
    addPayment: (
      id: string,
      payment: { amount: number; method: PaymentMethod; accountId?: string; note?: string }
    ) => payM.mutateAsync({ id, payment }),
    delete: (id: string) => delM.mutateAsync(id),
    update: (id: string, input: Record<string, unknown>) => updateM.mutateAsync({ id, input }),
  };
}

export interface PurchaseFilters {
  search?: string;
  status?: string;
}

export function useFilteredPurchases({ search = "", status = "All" }: PurchaseFilters) {
  const raw = usePurchases();
  return useMemo(() => {
    const q = search.toLowerCase();
    return raw.filter((p: any) => {
      const poNum = p.poNumber ?? p.invoiceNo ?? "";
      const supName = p.supplierName ?? (p.supplier?.name) ?? "";
      return (
        (status === "All" || p.status === status) &&
        (poNum.toLowerCase().includes(q) ||
          supName.toLowerCase().includes(q))
      );
    });
  }, [raw, status, search]);
}

export function useRestockActions() {
  const qc = useQueryClient();
  const run = <T,>(p: Promise<T>) =>
    p.then((r) => {
      invalidateProcurement(qc);
      return r;
    }).catch((e: Error) => {
      toast.error(e.message);
      throw e;
    });
  return {
    createDraft: (note?: string) => run(purchasesService.createRestockDraft(note)),
    updateItem: (id: string, productId: string, qty: number) =>
      run(purchasesService.updateRestockItem(id, productId, qty)),
    removeItem: (id: string, productId: string) =>
      run(purchasesService.removeRestockItem(id, productId)),
    confirm: (id: string, supplierId?: string | null) =>
      run(purchasesService.confirmRestock(id, supplierId)),
    delete: (id: string) => run(purchasesService.removeRestock(id)),
  };
}
