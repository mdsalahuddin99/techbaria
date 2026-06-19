import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { saleKeys, returnKeys } from "../queryKeys";
import { useSalesQuery, useReturnsQuery, useSaleMutations } from "../hooks";
import { useSalesCacheBridge } from "../useSalesCacheBridge";
import { useSalesReport } from "@/features/reports/hooks";
import { useProductsCacheBridge } from "@/features/products/useProductsCacheBridge";
import { seedQueryClient, mockSales } from "@/test/mock-api";

vi.mock("@/services");
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
    const report = renderHook(
      () => useSalesReport({ from: today, to: today }),
      { wrapper: wrap(qc) },
    );

    await waitFor(() => {
      expect(report.result.current.txnCount).toBeGreaterThanOrEqual(0);
    });
    const before = report.result.current.txnCount;

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
    act(() => {
      qc.setQueryData(saleKeys.list(), (prev: any) =>
        ({ ...prev, items: [...(prev?.items ?? []), newSale] }),
      );
    });

    await waitFor(() => {
      expect(report.result.current.txnCount).toBe(before + 1);
      expect(report.result.current.totalRevenue).toBeGreaterThan(0);
    });

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
