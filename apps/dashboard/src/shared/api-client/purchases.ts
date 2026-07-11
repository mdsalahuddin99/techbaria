/**
 * Typed fetch wrapper for the purchases API.
 */
import { apiFetch } from "./fetch";
import type { PurchaseOrder, PurchasePayment, RestockOrder } from "@/features/purchases/types";

const BASE = "/api/purchases";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const purchasesApi = {
  // ---- purchases
  list(filter?: any, params?: { cursor?: string; limit?: number }): Promise<PaginatedResponse<PurchaseOrder>> {
    const q = new URLSearchParams();
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", params.limit.toString());
    if (filter?.search) q.set("search", filter.search);
    if (filter?.status) q.set("status", filter.status);
    if (filter?.sortKey) q.set("sortKey", filter.sortKey);
    if (filter?.sortDir) q.set("sortDir", filter.sortDir);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiFetch<PaginatedResponse<PurchaseOrder>>(`${BASE}${qs}`);
  },

  getById(id: string): Promise<PurchaseOrder | null> {
    return apiFetch<PurchaseOrder | null>(`${BASE}/${id}`);
  },

  create(input: Record<string, unknown>): Promise<PurchaseOrder> {
    return apiFetch<PurchaseOrder>(BASE, { method: "POST", body: JSON.stringify(input) });
  },

  update(id: string, input: Record<string, unknown>): Promise<PurchaseOrder> {
    return apiFetch<PurchaseOrder>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },

  receive(id: string, receivedQuantities: Record<string, number>): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}/receive`, { method: "POST", body: JSON.stringify({ receivedQuantities }) });
  },

  addPayment(id: string, payment: Record<string, unknown>): Promise<PurchasePayment> {
    return apiFetch<PurchasePayment>(`${BASE}/${id}/payment`, { method: "POST", body: JSON.stringify(payment) });
  },

  removePayment(id: string, paymentId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}/payment/${paymentId}`, { method: "DELETE" });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },

  // ---- restocks (future API endpoints)
  listRestocks(): Promise<RestockOrder[]> {
    return apiFetch<RestockOrder[]>(`${BASE}/restocks`);
  },

  createRestockDraft(note?: string): Promise<RestockOrder> {
    return apiFetch<RestockOrder>(`${BASE}/restocks`, { method: "POST", body: JSON.stringify({ note }) });
  },

  updateRestockItem(id: string, productId: string, qty: number): Promise<void> {
    return apiFetch<void>(`${BASE}/restocks/${id}/items`, { method: "PATCH", body: JSON.stringify({ productId, qty }) });
  },

  removeRestockItem(id: string, productId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/restocks/${id}/items/${productId}`, { method: "DELETE" });
  },

  confirmRestock(id: string, supplierId?: string | null): Promise<void> {
    return apiFetch<void>(`${BASE}/restocks/${id}/confirm`, { method: "POST", body: JSON.stringify({ supplierId }) });
  },

  removeRestock(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/restocks/${id}`, { method: "DELETE" });
  },
};
