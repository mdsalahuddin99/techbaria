import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePosStore } from "@/store/usePosStore";
import { productKeys } from "../queryKeys";
import { useProductsQuery, useProduct, useLowStockProducts } from "../hooks";
import { useProductsCacheBridge } from "../useProductsCacheBridge";
import { seedQueryClient, mockProducts } from "@/test/mock-api";
import type { ReactNode } from "react";

// Auto-mock @/services then override with mock implementations
vi.mock("@/services");
import { productsService } from "@/services";
import type { Product } from "@/features/products/types";

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("products hooks + cache bridge", () => {
  beforeEach(() => {
    usePosStore.setState({ cart: [], discount: 0, selectedCustomerId: null, activeBranchId: null });
    vi.mocked(productsService.list).mockResolvedValue({ items: [...mockProducts] } as any);
    vi.mocked(productsService.getById).mockImplementation(async (id: string) => {
      const found = mockProducts.find((p) => p.id === id);
      return found ? { ...found, wholesalePrice: 0 } : null;
    });
  });

  it("useProductsQuery seeds from cache via bridge", async () => {
    const qc = freshClient();
    seedQueryClient(qc);
    renderHook(() => useProductsCacheBridge(), { wrapper: wrapper(qc) });
    const { result } = renderHook(() => useProductsQuery(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.data?.items?.length).toBeGreaterThan(0));
    expect(result.current.data?.items).toEqual(mockProducts);
  });

  it("bridge updates cache when store products change", async () => {
    const qc = freshClient();
    seedQueryClient(qc);
    renderHook(() => useProductsCacheBridge(), { wrapper: wrapper(qc) });

    const first = mockProducts[0];
    const newStock = first.stock + 7;

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === first.id ? { ...p, stock: newStock } : p,
        ),
      }));
    });

    await waitFor(() => {
      const cached = qc.getQueryData(productKeys.list()) as any;
      const found = cached?.items?.find((p: any) => p.id === first.id);
      expect(found?.stock).toBe(newStock);
    });
  });

  it("useProduct returns the matching item from cache", async () => {
    const qc = freshClient();
    seedQueryClient(qc);
    renderHook(() => useProductsCacheBridge(), { wrapper: wrapper(qc) });
    const target = mockProducts[0];
    const { result } = renderHook(() => useProduct(target.id), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current?.id).toBe(target.id));
  });

  it("useLowStockProducts filters by minStock", async () => {
    const qc = freshClient();
    seedQueryClient(qc);
    renderHook(() => useProductsCacheBridge(), { wrapper: wrapper(qc) });

    const target = mockProducts.find((p) => p.active);
    expect(target).toBeTruthy();
    if (!target) return;

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: 0, minStock: 5 } : p,
        ),
      }));
    });

    const { result } = renderHook(() => useLowStockProducts(), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => {
      expect(result.current.some((p) => p.id === target.id)).toBe(true);
    });
  });
});
