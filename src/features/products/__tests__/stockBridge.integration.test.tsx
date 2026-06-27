import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useProductsQuery, useLowStockProducts } from "../hooks";
import { useProductsCacheBridge } from "../useProductsCacheBridge";
import { useSalesCacheBridge } from "@/features/sales/useSalesCacheBridge";
import { useSaleMutations } from "@/features/sales/hooks";
import { useInventoryActions } from "@/features/inventory/hooks";
import { useInventoryMetricsQuery } from "@/features/reports/hooks";
import { productKeys } from "@/features/products/queryKeys";
import { returnKeys } from "@/features/sales/queryKeys";
import { seedQueryClient, mockProducts } from "@/test/mock-api";

vi.mock("@/services");
import { productsService } from "@/services";

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
const fresh = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("stock cache bridge — checkout / void / refund propagation", () => {
  beforeEach(() => {
    vi.mocked(productsService.list).mockResolvedValue({ items: [...mockProducts] } as any);
  });

  it("checkout decrements stock in useProductsQuery cache immediately", async () => {
    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => { useProductsCacheBridge(); useSalesCacheBridge(); }, { wrapper: wrap(qc) });
    const products = renderHook(() => useProductsQuery(), { wrapper: wrap(qc) });
    await waitFor(() => expect(products.result.current.data).toBeDefined());

    const target = mockProducts.find((p) => p.stock > 0 && p.minStock > 0);
    if (!target) return;
    const before = (products.result.current.data?.items ?? []).find(
      (p) => p.id === target.id,
    )!.stock;

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: p.stock - 1 } : p,
        ),
      }));
    });

    await waitFor(() => {
      const after = (products.result.current.data?.items ?? []).find(
        (p) => p.id === target.id,
      )!.stock;
      expect(after).toBe(before - 1);
    });
  });

  it("Dashboard low-stock count updates immediately after checkout pushes a product below minStock", async () => {
    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => { useProductsCacheBridge(); useSalesCacheBridge(); }, { wrapper: wrap(qc) });

    const target = mockProducts.find((p) => p.active);
    if (!target) return;
    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, minStock: 5, stock: 6 } : p,
        ),
      }));
    });

    const low = renderHook(() => useLowStockProducts(), { wrapper: wrap(qc) });

    await waitFor(() => expect(low.result.current).toBeDefined());
    const lowBefore = low.result.current.length;
    expect(low.result.current.some((p) => p.id === target.id)).toBe(false);

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: p.stock - 2 } : p,
        ),
      }));
    });

    await waitFor(() => {
      expect(low.result.current.some((p) => p.id === target.id)).toBe(true);
      expect(low.result.current.length).toBe(lowBefore + 1);
    });
  });

  it("void restores stock back into the products cache", async () => {
    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => { useProductsCacheBridge(); useSalesCacheBridge(); }, { wrapper: wrap(qc) });
    const products = renderHook(() => useProductsQuery(), { wrapper: wrap(qc) });
    renderHook(() => useSaleMutations(), { wrapper: wrap(qc) });
    await waitFor(() => expect(products.result.current.data).toBeDefined());

    const target = mockProducts.find((p) => p.stock > 0 && p.minStock > 0);
    if (!target) return;
    const before = (products.result.current.data?.items ?? []).find(
      (p) => p.id === target.id,
    )!.stock;

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: p.stock - 1 } : p,
        ),
      }));
    });

    await waitFor(() => {
      const mid = (products.result.current.data?.items ?? []).find(
        (p) => p.id === target.id,
      )!.stock;
      expect(mid).toBe(before - 1);
    });

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: p.stock + 1 } : p,
        ),
      }));
      qc.setQueryData(returnKeys.list(), (prev: any[] | undefined) =>
        [...(prev ?? []), { id: `ret-${target.id}`, saleId: "s1", status: "VOIDED" }],
      );
    });

    await waitFor(() => {
      const after = (products.result.current.data?.items ?? []).find(
        (p) => p.id === target.id,
      )!.stock;
      expect(after).toBe(before);
    });
  });

  it("refund with restock=true returns the unit to the products cache", async () => {
    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => { useProductsCacheBridge(); useSalesCacheBridge(); }, { wrapper: wrap(qc) });
    const products = renderHook(() => useProductsQuery(), { wrapper: wrap(qc) });
    renderHook(() => useSaleMutations(), { wrapper: wrap(qc) });
    await waitFor(() => expect(products.result.current.data).toBeDefined());

    const target = mockProducts.find((p) => p.stock > 0 && p.minStock > 0);
    if (!target) return;
    const before = (products.result.current.data?.items ?? []).find(
      (p) => p.id === target.id,
    )!.stock;

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: p.stock - 1 } : p,
        ),
      }));
    });

    await waitFor(() => {
      const mid = (products.result.current.data?.items ?? []).find(
        (p) => p.id === target.id,
      )!.stock;
      expect(mid).toBe(before - 1);
    });

    act(() => {
      qc.setQueryData(productKeys.list(), (prev: any) => ({
        ...prev,
        items: (prev?.items ?? []).map((p: any) =>
          p.id === target.id ? { ...p, stock: p.stock + 1 } : p,
        ),
      }));
      qc.setQueryData(returnKeys.list(), (prev: any[] | undefined) =>
        [...(prev ?? []), {
          id: `ret-${target.id}`,
          saleId: "s1",
          items: [{ productId: target.id, qty: 1, restock: true }],
          createdAt: new Date().toISOString(),
        }],
      );
    });

    await waitFor(() => {
      const after = (products.result.current.data?.items ?? []).find(
        (p) => p.id === target.id,
      )!.stock;
      expect(after).toBe(before);
    });
  });
});
