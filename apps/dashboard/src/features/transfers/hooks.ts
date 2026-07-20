import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transfersService } from "@/services";
import { transferKeys } from "./queryKeys";
import { productKeys } from "@/features/products/queryKeys";
import { auditKeys } from "@/features/audit/queryKeys";
import type { StockTransfer, TransferInput } from "./types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

/**
 * Primary transfers-list query. The `useTransfersCacheBridge` (mounted
 * in AppProviders) keeps this cache in sync with the Zustand slice
 * during the local-driver phase.
 */
export function useTransfersQuery() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: transferKeys.list(),
    queryFn: () => transfersService.list(),
    enabled: status !== "loading" && !!session,
    ...QueryTier.MASTER_DATA,
  });
}

export function useTransfers(): StockTransfer[] {
  const { data } = useTransfersQuery();
  return ((data as any)?.items ?? []) as StockTransfer[];
}

export function useFilteredTransfers({
  search,
  status,
}: {
  search?: string;
  status?: string;
}) {
  const transfers = useTransfers();
  return useMemo(() => {
    const q = (search ?? "").trim().toLowerCase();
    return transfers.filter((t) => {
      if (status && status !== "All" && t.status !== status) return false;
      if (!q) return true;
      return (
        (t.transferNumber || "").toLowerCase().includes(q) ||
        (t.fromWarehouseName || "").toLowerCase().includes(q) ||
        (t.toWarehouseName || "").toLowerCase().includes(q)
      );
    });
  }, [transfers, search, status]);
}

/**
 * Invalidate every cache a transfer mutation could touch. Today only
 * `transfers` actually changes, but dispatch/receive will eventually
 * adjust per-branch product stock and append an audit entry — wiring
 * those invalidations now means the future driver flip is a no-op.
 */
function invalidateTransferAdjacent(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: transferKeys.all });
  qc.invalidateQueries({ queryKey: productKeys.all });
  qc.invalidateQueries({ queryKey: auditKeys.all });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferInput) => transfersService.create(input),
    onSuccess: () => invalidateTransferAdjacent(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDispatchTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersService.dispatch(id),
    onSuccess: () => invalidateTransferAdjacent(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReceiveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersService.receive(id),
    onSuccess: () => invalidateTransferAdjacent(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersService.cancel(id),
    onSuccess: () => invalidateTransferAdjacent(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersService.remove(id),
    onSuccess: () => invalidateTransferAdjacent(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Backward-compat action bag for legacy callers. New code should
 * prefer the explicit mutation hooks above.
 */
export function useTransferActions() {
  return {
    create: transfersService.create,
    dispatch: transfersService.dispatch,
    receive: transfersService.receive,
    cancel: transfersService.cancel,
    remove: transfersService.remove,
  };
}
