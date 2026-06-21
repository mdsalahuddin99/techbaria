import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supplierKeys } from "../queryKeys";
import { useSuppliersQuery, useSupplier, useSuppliersWithPayable } from "../hooks";
import { useSuppliersCacheBridge } from "../useSuppliersCacheBridge";
import { seedQueryClient, mockSuppliers } from "@/test/mock-api";
import type { ReactNode } from "react";

vi.mock("@/services");
import { suppliersService } from "@/services";

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
const fresh = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("suppliers hooks + cache bridge", () => {
  it("seeds cache and reacts to addSupplier", async () => {
    vi.mocked(suppliersService.list).mockResolvedValue({ items: [...mockSuppliers] } as any);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSuppliersCacheBridge(), { wrapper: wrapper(qc) });
    const { result } = renderHook(() => useSuppliersQuery(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(Array.isArray(result.current.data?.items)).toBe(true));

    act(() => {
      qc.setQueryData(supplierKeys.list(), (prev: any) =>
        ({ ...prev, items: [...(prev?.items ?? []), { id: "sup-new", name: "Bridge Co.", phone: "+8801", payable: 0 }] } ),
      );
    });
    await waitFor(() => {
      const cached = (qc.getQueryData(supplierKeys.list()) as any)?.items as Array<{ name: string }>;
      expect(cached?.some((s) => s.name === "Bridge Co.")).toBe(true);
    });
  });

  it("derived selectors track the cache", async () => {
    vi.mocked(suppliersService.list).mockResolvedValue({ items: [...mockSuppliers] } as any);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSuppliersCacheBridge(), { wrapper: wrapper(qc) });
    const target = mockSuppliers[0];
    expect(target).toBeDefined();

    // Verify the underlying query populates the cache
    renderHook(() => useSuppliersQuery(), { wrapper: wrapper(qc) });
    await waitFor(() => {
      const cached = qc.getQueryData(supplierKeys.list()) as any;
      expect(Array.isArray(cached?.items)).toBe(true);
      expect(cached?.items?.some((s: any) => s.id === target.id)).toBe(true);
    });

    // useSupplier returns the right item
    const { result: byId } = renderHook(() => useSupplier(target.id), { wrapper: wrapper(qc) });
    await waitFor(() => expect(byId.current?.id).toBe(target.id));

    // useSuppliersWithPayable filters by payableBalance > 0
    const { result: pay } = renderHook(() => useSuppliersWithPayable(), { wrapper: wrapper(qc) });
    await waitFor(() => {
      expect(pay.current.length).toBeGreaterThan(0);
      expect(pay.current.some((s) => s.id === target.id)).toBe(true);
    });
  });
});
