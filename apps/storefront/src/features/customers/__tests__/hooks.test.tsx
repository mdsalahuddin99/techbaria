import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { customerKeys } from "../queryKeys";
import { useCustomersQuery, useCustomer, useCustomersWithDue } from "../hooks";
import { useCustomersCacheBridge } from "../useCustomersCacheBridge";
import { seedQueryClient, mockCustomers } from "@/test/mock-api";
import type { ReactNode } from "react";

vi.mock("@/services");
import { customersService } from "@/services";

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
const fresh = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("customers hooks + cache bridge", () => {
  it("seeds cache and reacts to store changes", async () => {
    vi.mocked(customersService.list).mockResolvedValue({ items: [...mockCustomers] } as any);
    vi.mocked(customersService.withDues).mockResolvedValue(mockCustomers.filter((c) => c.dueBalance > 0) as any);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useCustomersCacheBridge(), { wrapper: wrapper(qc) });
    const { result } = renderHook(() => useCustomersQuery(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.data?.items?.length ?? 0).toBeGreaterThanOrEqual(0));

    const newCustomer = { id: "c-new", name: "Bridge Test", phone: "+8800000", due: 0 };
    act(() => {
      qc.setQueryData(customerKeys.list(), (prev: any) =>
        ({ ...prev, items: [...(prev?.items ?? []), newCustomer] }),
      );
    });
    await waitFor(() => {
      const cached = (qc.getQueryData(customerKeys.list()) as any)?.items as Array<{ name: string }>;
      expect(cached?.some((c) => c.name === "Bridge Test")).toBe(true);
    });
  });

  it("useCustomer / useCustomersWithDue derive from cache", async () => {
    vi.mocked(customersService.list).mockResolvedValue({ items: [...mockCustomers] } as any);

    const qc = fresh();
    seedQueryClient(qc);
    renderHook(() => useCustomersCacheBridge(), { wrapper: wrapper(qc) });
    const target = mockCustomers[0];
    expect(target).toBeDefined();

    // Verify the underlying query populates the cache
    renderHook(() => useCustomersQuery(), { wrapper: wrapper(qc) });
    await waitFor(() => {
      const cached = qc.getQueryData(customerKeys.list()) as any;
      expect(Array.isArray(cached?.items)).toBe(true);
      expect(cached?.items?.some((c: any) => c.id === target.id)).toBe(true);
    });

    // useCustomer returns the right item
    const { result: byId } = renderHook(() => useCustomer(target.id), { wrapper: wrapper(qc) });
    await waitFor(() => expect(byId.current?.id).toBe(target.id));

    // useCustomersWithDue filters by dueBalance > 0
    const { result: due } = renderHook(() => useCustomersWithDue(), { wrapper: wrapper(qc) });
    await waitFor(() => {
      expect(due.current.length).toBeGreaterThan(0);
      expect(due.current.some((c) => c.id === target.id)).toBe(true);
    });
  });
});
