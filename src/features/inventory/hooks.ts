import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/services";
import { useProductsQuery } from "@/features/products/hooks";
import { productKeys } from "@/features/products/queryKeys";
import { inventoryKeys } from "./queryKeys";
import type { AdjustmentType, StockAdjustment } from "@/shared/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

// useInventoryStats removed in favor of backend useInventoryMetricsQuery

/** Primary adjustments query — fed by `useAdjustmentsCacheBridge`. */
export function useAdjustmentsQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.scope("adjustments"),
    queryFn: () => inventoryService.listAdjustments(),
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.MASTER_DATA,  // no polling — mutation onSuccess invalidates
  });
}

/** Backward-compat hook (returns adjustments list directly). */
export function useAdjustments(initialData?: StockAdjustment[]): StockAdjustment[] {
  const { data } = useAdjustmentsQuery(
    initialData ? { items: initialData, total: initialData.length } : undefined
  );
  return ((data as any)?.items ?? []) as StockAdjustment[];
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      productId: string;
      type: AdjustmentType;
      qty: number;
      reason: string;
      reference?: string;
      note?: string;
    }) => inventoryService.adjust({
      productId: input.productId,
      qtyDelta: input.type === "Remove" ? -Math.abs(input.qty) : input.qty,
      reason: input.reason,
      notes: input.note || input.reference,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInventoryActions() {
  const adjustM = useAdjustStock();
  return {
    adjust: (input: {
      productId: string;
      type: AdjustmentType;
      qty: number;
      reason: string;
      reference?: string;
      note?: string;
    }) => adjustM.mutateAsync(input),
  };
}
