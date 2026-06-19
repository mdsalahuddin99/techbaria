/**
 * Typed fetch wrapper for the suppliers API.
 */
import { apiFetch } from "./fetch";
import type { Supplier } from "@/features/suppliers/types";

const BASE = "/api/suppliers";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const suppliersApi = {
  list(): Promise<PaginatedResponse<Supplier>> {
    return apiFetch<PaginatedResponse<Supplier>>(BASE);
  },

  getById(id: string): Promise<Supplier | null> {
    return apiFetch<Supplier | null>(`${BASE}/${id}`);
  },

  create(data: Omit<Supplier, "id" | "createdAt" | "payableBalance" | "totalPurchased">): Promise<Supplier> {
    return apiFetch<Supplier>(BASE, { method: "POST", body: JSON.stringify(data) });
  },

  update(id: string, patch: Partial<Supplier>): Promise<Supplier | null> {
    return apiFetch<Supplier | null>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },
};
