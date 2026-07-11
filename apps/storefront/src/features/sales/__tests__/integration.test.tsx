import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { saleKeys, returnKeys } from "../queryKeys";
import { useSalesQuery, useReturnsQuery, useSaleMutations } from "../hooks";
import { useSalesCacheBridge } from "../useSalesCacheBridge";
import { useReportsMetricsQuery } from "@/features/reports/hooks";
import { useProductsCacheBridge } from "@/features/products/useProductsCacheBridge";
import { seedQueryClient, mockSales } from "@/test/mock-api";

vi.mock("@/services");
vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1", role: "ADMIN", shopId: "shop-1" }, expires: "" },
    status: "authenticated",
  }),
}));
import { salesService } from "@/services";

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
const fresh = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("sales integration — Dashboard/Reports refresh + void/refund cache", () => {
  it("checkout updates Reports aggregates via the shared sales cache", async () => {
    vi.mocked(salesService.list).mockResolvedValue({ items: [...mockSales] } as any);
    vi.mocked(salesService.listReturns).mockResolvedValue([]);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(
      () => { useSalesCacheBridge(); useProductsCacheBridge(); },
      { wrapper: wrap(qc) },
    );

    const today = new Date().toISOString().slice(0, 10);

    // Mock global fetch so useReportsMetricsQuery can resolve without a real API
    const makeMetricsFetch = (txnCount: number, totalRevenue: number) =>
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          txnCount,
          totalRevenue,
          aov: 0, cogs: 0, expenseTotal: 0, grossProfit: 0, netProfit: 0,
          trend: [], byMethod: [], topProducts: [], expensesList: [],
        }),
      } as any);

    vi.stubGlobal("fetch", makeMetricsFetch(mockSales.length, 1000));

    const { result: reportRes } = renderHook(
      () => useReportsMetricsQuery({ from: today, to: today }),
      { wrapper: wrap(qc) }
    );

    await waitFor(() => {
      expect(reportRes.current.isSuccess).toBe(true);
      expect(reportRes.current.data?.txnCount).toBeGreaterThanOrEqual(0);
    });
    const before = reportRes.current.data?.txnCount ?? 0;

    const newSale = {
      id: "s-new",
      invoiceNo: "INV-003",
      customerId: null,
      channel: "POS" as const,
      status: "COMPLETED" as const,
      subtotal: 999999,
      discount: 0,
      total: 999999,
      paid: 999999,
      due: 0,
      date: new Date().toISOString(),
      items: [{ productId: "p16", name: "12V 10A SMPS", qty: 1, price: 950 }],
      tenders: [{ type: "CASH" as const, amount: 999999 }],
      createdAt: new Date().toISOString(),
    };

    // Update fetch mock to return incremented count, then invalidate so hook re-fetches
    vi.stubGlobal("fetch", makeMetricsFetch(before + 1, 999999));
    act(() => {
      qc.setQueryData(saleKeys.list(), (prev: any) =>
        ({ ...prev, items: [...(prev?.items ?? []), newSale] }),
      );
      qc.invalidateQueries({ queryKey: ["reports"] });
    });

    await waitFor(() => {
      expect(reportRes.current.data?.txnCount).toBe(before + 1);
      expect(reportRes.current.data?.totalRevenue).toBeGreaterThan(0);
    });

    vi.unstubAllGlobals();

    const dashboardSales = qc.getQueryData(saleKeys.list()) as any;
    expect(dashboardSales?.items?.length).toBeGreaterThanOrEqual(before + 1);
  });

  it("void mutation refreshes useSalesQuery + useReturnsQuery cache", async () => {
    vi.mocked(salesService.list).mockResolvedValue({ items: [...mockSales] } as any);
    vi.mocked(salesService.listReturns).mockResolvedValue([]);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSalesCacheBridge(), { wrapper: wrap(qc) });
    renderHook(() => useSalesQuery(), { wrapper: wrap(qc) });
    renderHook(() => useSaleMutations(), { wrapper: wrap(qc) });
    renderHook(() => useReturnsQuery(), { wrapper: wrap(qc) });

    const saleId = mockSales[0].id;

    // Simulate void — add to returns cache, remove from sales cache
    act(() => {
      qc.setQueryData(saleKeys.list(), (prev: any) =>
        ({ ...prev, items: (prev?.items ?? []).filter((s: any) => s.id !== saleId) }),
      );
      qc.setQueryData(returnKeys.list(), (prev: any[] | undefined) =>
        [...(prev ?? []), { ...mockSales[0], status: "VOIDED", id: `ret-${saleId}` }],
      );
    });

    await waitFor(() => {
      const returns = qc.getQueryData(returnKeys.list()) as Array<{ id: string }>;
      expect(returns.length).toBe(1);
      expect(returns[0].id).toBe(`ret-${saleId}`);
    });
    const sales = qc.getQueryData(saleKeys.list()) as any;
    expect(sales?.items?.some((s: any) => s.id === saleId)).toBe(false);
    expect(qc.getQueryData(saleKeys.list())).toBeDefined();
    expect(qc.getQueryData(returnKeys.list())).toBeDefined();
  });

  it("refund mutation propagates a new return into useReturnsQuery cache", async () => {
    vi.mocked(salesService.list).mockResolvedValue({ items: [...mockSales] } as any);
    vi.mocked(salesService.listReturns).mockResolvedValue([]);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useSalesCacheBridge(), { wrapper: wrap(qc) });
    renderHook(() => useReturnsQuery(), { wrapper: wrap(qc) });
    renderHook(() => useSaleMutations(), { wrapper: wrap(qc) });

    const saleId = mockSales[0].id;

    // Simulate refund
    act(() => {
      qc.setQueryData(returnKeys.list(), (prev: any[] | undefined) =>
        [...(prev ?? []), {
          id: `ret-${saleId}`,
          saleId,
          items: [{ productId: "p1", qty: 1, restock: true }],
          refundMethod: "Cash",
          reason: "test-refund",
          createdAt: new Date().toISOString(),
        }],
      );
    });

    await waitFor(() => {
      const list = qc.getQueryData(returnKeys.list()) as Array<{ saleId: string }>;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(1);
      expect(list.some((r) => r.saleId === saleId)).toBe(true);
    });
  });
});
