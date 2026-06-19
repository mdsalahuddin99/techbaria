/**
 * Typed fetch wrapper for the sales API.
 */
import { apiFetch } from "./fetch";
import type { Sale, SaleReturn } from "@/features/sales/types";

const BASE = "/api/sales";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const salesApi = {
  list(channel?: string, customerId?: string): Promise<PaginatedResponse<Sale>> {
    const params = new URLSearchParams();
    if (channel) params.set("channel", channel);
    if (customerId) params.set("customerId", customerId);
    const qs = params.toString();
    return apiFetch<PaginatedResponse<Sale>>(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id: string): Promise<Sale | null> {
    return apiFetch<Sale | null>(`${BASE}/${id}`);
  },

  byCustomer(customerId: string): Promise<Sale[]> {
    return apiFetch<Sale[]>(`${BASE}/by-customer?customerId=${encodeURIComponent(customerId)}`);
  },

  create(input: Record<string, unknown>): Promise<Sale> {
    return apiFetch<Sale>(BASE, { method: "POST", body: JSON.stringify(input) });
  },

  void(saleId: string, reason: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${saleId}/void`, { method: "POST", body: JSON.stringify({ reason }) });
  },

  refund(input: {
    saleId: string;
    items: Array<{ productId: string; qty: number; restock: boolean }>;
    refundMethod: string;
    restockingFee?: number;
    reason: string;
    note?: string;
  }): Promise<SaleReturn> {
    return apiFetch<SaleReturn>(`${BASE}/${input.saleId}/refund`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listReturns(): Promise<SaleReturn[]> {
    // Returns are currently embedded in sales data
    return this.list().then((res) =>
      res.items.filter((s) => s.status === "REFUNDED" || s.status === "VOIDED") as unknown as SaleReturn[],
    );
  },

  deleteReturn(id: string): Promise<void> {
    return apiFetch<void>(`/api/returns/${id}`, { method: "DELETE" });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },

  update(id: string, input: Record<string, unknown>): Promise<Sale> {
    return apiFetch<Sale>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
};
