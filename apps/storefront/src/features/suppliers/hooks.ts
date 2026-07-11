import { useMemo } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersService } from "@/services";
import { suppliersApi } from "@/shared/api-client/suppliers";
import { supplierKeys } from "./queryKeys";
import { Supplier, SupplierPayment } from "@/shared/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

/**
 * Primary supplier-list query. Kept reactive in the local-driver phase
 * by `useSuppliersCacheBridge` (mounted in AppProviders).
 */
export function useSuppliersQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: supplierKeys.list(),
    queryFn: () => suppliersApi.list(),
    enabled: status !== "loading" && !!session,
    initialData: initialData ? { items: initialData, nextCursor: null, hasMore: false } : undefined,
    ...QueryTier.MASTER_DATA,
  });
}

export function useInfiniteSuppliersQuery(
  filter?: { search?: string; sortKey?: string; sortDir?: "asc" | "desc" },
  initialData?: any
) {
  const { session, status } = useAuth();
  return useInfiniteQuery({
    queryKey: [...supplierKeys.list(), filter],
    queryFn: ({ pageParam }) => suppliersApi.list(filter, pageParam ? { cursor: pageParam } : undefined),
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: status !== "loading" && !!session,
    initialData,
  });
}

export function useSuppliers(initialData?: Supplier[]) {
  const { data, isLoading, error } = useSuppliersQuery(initialData);
  return {
    data: ((data as any)?.items ?? []) as Supplier[],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}

export function useSupplierLedgerQuery(id: string, page = 1) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: [...supplierKeys.all, "ledger", id, page],
    queryFn: () => suppliersApi.getLedger(id, page),
    enabled: status !== "loading" && !!session && !!id,
  });
}

/** Single supplier by id, from the list cache. */
export function useSupplier(id: string | null | undefined) {
  const { data } = useSuppliersQuery();
  const suppliers = ((data as any)?.items ?? []) as Supplier[];
  return useMemo(
    () => (id ? suppliers.find((s) => s.id === id) ?? null : null),
    [suppliers, id],
  );
}

/** Suppliers with an outstanding payable balance. */
export function useSuppliersWithPayable() {
  const { data } = useSuppliersQuery();
  const suppliers = ((data as any)?.items ?? []) as Supplier[];
  return useMemo(
    () => suppliers.filter((s) => s.payableBalance > 0),
    [suppliers],
  );
}

// ---------- Mutations ----------

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Supplier, "id" | "createdAt" | "totalPurchased" | "payableBalance">) =>
      suppliersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("Supplier added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Supplier> }) =>
      suppliersService.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("Supplier updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("Supplier deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRecordSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SupplierPayment, "id" | "date">) => {
      const supplier = await suppliersService.getById(data.supplierId);
      if (supplier) {
        await suppliersService.update(data.supplierId, {
          payableBalance: supplier.payableBalance - data.amount,
        } as any);
      }
      return { success: true };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success(`Payment of ৳${vars.amount.toLocaleString()} recorded`);
    },
  });
}

export function useSupplierDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { supplierId: string; amount: number; accountId: string; reference?: string; notes?: string; date?: string }) =>
      suppliersApi.depositAdvance(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("Advance deposited successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSupplierWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { supplierId: string; amount: number; accountId: string; reference?: string; notes?: string; date?: string }) =>
      suppliersApi.withdrawAdvance(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("Advance withdrawn successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
