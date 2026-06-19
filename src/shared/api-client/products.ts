/**
 * Typed fetch wrapper for the products API.
 * Matches the same API surface as the old src/services/productsService.ts
 * so that existing feature hooks (importing from @/services) work unchanged.
 */
import { apiFetch } from "./fetch";
import type { Product } from "@/features/products/types";

const BASE = "/api/products";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const productsApi = {
  /** List products with optional filters */
  list(filter?: { search?: string; categoryId?: string; isPublished?: boolean; lowStock?: boolean }): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filter?.search) params.set("search", filter.search);
    if (filter?.categoryId) params.set("categoryId", filter.categoryId);
    if (filter?.isPublished !== undefined) params.set("isPublished", String(filter.isPublished));
    if (filter?.lowStock) params.set("lowStock", "true");
    const qs = params.toString();
    return apiFetch<PaginatedResponse<Product>>(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id: string): Promise<Product | null> {
    return apiFetch<Product | null>(`${BASE}/${id}`);
  },

  create(data: any): Promise<Product> {
    return apiFetch<Product>(BASE, { method: "POST", body: JSON.stringify(data) });
  },

  update(id: string, patch: Partial<Product>): Promise<Product | null> {
    return apiFetch<Product | null>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },

  bulkUpdate(ids: string[], patch: Partial<Product>): Promise<void> {
    // Future: POST /api/products/bulk when implemented
    return Promise.all(ids.map((id) => this.update(id, patch))).then(() => undefined);
  },

  bulkRemove(ids: string[]): Promise<void> {
    return Promise.all(ids.map((id) => this.remove(id))).then(() => undefined);
  },
};
