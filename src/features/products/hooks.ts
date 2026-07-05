import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsService } from "@/services";
import { productKeys } from "./queryKeys";
import type { Product } from "@/shared/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";
import { effectiveReorderPoint, bundleAvailableStock } from "./bundle";

/**
 * All product reads go through TanStack Query. During the local-driver
 * phase, `useProductsCacheBridge` (mounted in AppProviders) keeps the
 * cache hot from Zustand so consumers get instant reactivity. In the
 * HTTP driver phase, mutations invalidate the cache normally.
 */
export function useProductsQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: () => productsService.list(undefined, { limit: 2000 }),
    // Don't fire until we know the user is authenticated
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.MASTER_DATA,
  });
}

import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";

export function useInfiniteProductsQuery(filter?: { search?: string; categoryId?: string; isPublished?: boolean; lowStock?: boolean }) {
  const { session, status } = useAuth();
  return useInfiniteQuery({
    queryKey: [...productKeys.list(), filter],
    queryFn: ({ pageParam }) => productsService.list(filter, pageParam ? { cursor: pageParam } : undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: status !== "loading" && !!session,
    placeholderData: keepPreviousData,
  });
}

/**
 * Backward-compat alias. Returns the same shape older callers expect
 * (`{ data, isLoading, error }`) so we don't have to touch every page
 * in one shot. New code should prefer `useProductsQuery()`.
 */
export function useProducts(initialData?: Product[]) {
  const { data, isLoading, error } = useProductsQuery(
    initialData ? { items: initialData, total: initialData.length } : undefined
  );
  return {
    data: ((data as any)?.items ?? []) as Product[],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}

/** Single-product lookup via the products list cache. */
export function useProduct(id: string | null | undefined) {
  const { data } = useProductsQuery();
  return useMemo(
    () => (id ? ((data as any)?.items ?? []).find((p: Product) => p.id === id) ?? null : null),
    [data, id],
  );
}

/** Barcode/IMEI/serial lookup — used by POS global scanner. */
export function useProductByBarcode(code: string | null | undefined) {
  const { data } = useProductsQuery();
  const products = ((data as any)?.items ?? []) as Product[];
  return useMemo(() => {
    if (!code) return null;
    const trimmed = code.trim();
    if (!trimmed) return null;
    return (
      products.find(
        (p) =>
          p.barcode === trimmed ||
          p.sku === trimmed ||
          p.imei === trimmed ||
          p.serialNumber === trimmed,
      ) ?? null
    );
  }, [products, code]);
}

/**
 * Products at or below their `minStock` threshold. Bundles use derived
 * (component-based) stock. `minStock` is the single source of truth.
 */
export function useLowStockProducts() {
  const { data } = useProductsQuery();
  const products = ((data as any)?.items ?? []) as Product[];
  return useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      const threshold = effectiveReorderPoint(p);
      if (threshold <= 0) return false;
      const stock = p.type === "bundle" ? bundleAvailableStock(p, products) : p.stock;
      return stock <= threshold;
    });
  }, [products]);
}

/** Bundle products only (for editors / pickers). */
export function useBundleProducts() {
  const { data } = useProductsQuery();
  const products = ((data as any)?.items ?? []) as Product[];
  return useMemo(
    () => products.filter((p) => p.type === "bundle"),
    [products],
  );
}

// ---------- Mutations ----------

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Product, "id">) => productsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success("Product created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Product> }) =>
      productsService.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success("Product updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success("Product deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkUpdateProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: Partial<Product> }) =>
      productsService.bulkUpdate(ids, patch),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`${vars.ids.length} products updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkDeleteProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => productsService.bulkRemove(ids),
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`${ids.length} products deleted`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
