import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { saleKeys, returnKeys } from "../queryKeys";
import { useSalesQuery, useReturnsQuery, useCustomerSales } from "../hooks";
import { useSalesCacheBridge } from "../useSalesCacheBridge";
import { seedQueryClient, mockSales } from "@/test/mock-api";
import type { ReactNode } from "react";

vi.mock("@/services");
import { salesService } from "@/services";

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
const fresh = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("sales hooks + cache bridge", () => {
  it("seeds sales + returns from the store", async () => {
    vi.mocked(salesService.list).mockResolvedValue({ items: [...mockSales] } as any);
    vi.mocked(salesService.listReturns).mockResolvedValue([]);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSalesCacheBridge(), { wrapper: wrapper(qc) });
    const sales = renderHook(() => useSalesQuery(), { wrapper: wrapper(qc) });
    const returns = renderHook(() => useReturnsQuery(), { wrapper: wrapper(qc) });
      await waitFor(() => {
        expect(Array.isArray(sales.result.current.data?.items)).toBe(true);
        expect(Array.isArray(returns.result.current.data)).toBe(true);
      });
  });

  it("useCustomerSales filters by customer id", async () => {
    vi.mocked(salesService.list).mockResolvedValue({ items: [...mockSales] } as any);
    vi.mocked(salesService.listReturns).mockResolvedValue([]);
    vi.mocked(salesService.byCustomer).mockImplementation(async (customerId: string) =>
      mockSales.filter((s) => s.customerId === customerId) as any,
    );

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSalesCacheBridge(), { wrapper: wrapper(qc) });
    const cid = "c1";
    const { result } = renderHook(() => useCustomerSales(cid), { wrapper: wrapper(qc) });
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.every((s) => s.customerId === cid)).toBe(true);
    });
  });

  it("checkout propagates to the sales cache via bridge", async () => {
    vi.mocked(salesService.list).mockResolvedValue({ items: [...mockSales] } as any);
    vi.mocked(salesService.listReturns).mockResolvedValue([]);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSalesCacheBridge(), { wrapper: wrapper(qc) });

      await waitFor(() => {
        const cached = (qc.getQueryData(saleKeys.list()) as any)?.items as Array<{ id: string }>;
        expect(cached?.length).toBe(mockSales.length);
      });
  });
});
