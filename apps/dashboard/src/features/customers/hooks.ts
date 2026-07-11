import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersService } from "@/services";
import { customerKeys } from "./queryKeys";
import { Customer } from "@/shared/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

/**
 * Primary customer-list query. The `useCustomersCacheBridge` (mounted
 * in AppProviders) seeds and updates this cache from Zustand during the
 * local-driver phase, so reads are reactive without manual invalidation.
 */
import { useInfiniteQuery } from "@tanstack/react-query";

export function useCustomersQuery(initialData?: Customer[]) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: () => customersService.list(),
    initialData: initialData ? { items: initialData, nextCursor: null, hasMore: false } : undefined,
    enabled: status !== "loading" && !!session,
    ...QueryTier.MASTER_DATA,
  });
}

export function useInfiniteCustomersQuery(
  filter?: { search?: string; dueFilter?: "all" | "with-due" | "no-due"; sortKey?: string; sortDir?: "asc" | "desc" },
  initialData?: any
) {
  const { session, status } = useAuth();
  return useInfiniteQuery({
    queryKey: [...customerKeys.list(), filter],
    queryFn: ({ pageParam }) => customersService.list(filter, pageParam ? { cursor: pageParam } : undefined),
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: status !== "loading" && !!session,
    initialData,
  });
}

/** Backward-compat shape used by older callers. Prefer `useCustomersQuery`. */
export function useCustomers(initialData?: Customer[]) {
  const { data, isLoading, error } = useCustomersQuery(initialData);
  return {
    data: ((data as any)?.items ?? []) as Customer[],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}

/** Single customer by id, from the list cache. */
export function useCustomer(id: string | null | undefined) {
  const { data } = useCustomersQuery();
  const customers = ((data as any)?.items ?? []) as Customer[];
  return useMemo(
    () => (id ? customers.find((c) => c.id === id) ?? null : null),
    [customers, id],
  );
}

/** Customers with an outstanding balance (for Dues page / Accounts KPI). */
export function useCustomersWithDue() {
  const { data } = useCustomersQuery();
  const customers = ((data as any)?.items ?? []) as Customer[];
  return useMemo(
    () => customers.filter((c) => (c.due ?? 0) > 0),
    [customers],
  );
}

// ---------- Mutations ----------

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Customer, "id" | "createdAt" | "loyaltyPoints" | "totalSpent">) =>
      customersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success("Customer added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Customer> }) =>
      customersService.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success("Customer updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success("Customer deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
