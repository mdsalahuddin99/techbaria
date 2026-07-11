/**
 * Category API client — tree + flat list, CRUD.
 *
 * Uses the centralized `apiFetch` so server errors come through as typed
 * `ApiError` instances (NOT_FOUND, CONFLICT, VALIDATION, etc.).
 */
import { apiFetch } from "./fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
  brand?: string | null;
  productName?: string | null;
  productModel?: string | null;
  series?: string | null;
  createdAt: string;
  isPublished: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  brand?: string | null;
  productName?: string | null;
  productModel?: string | null;
  series?: string | null;
  createdAt: string;
  isPublished: boolean;
}

export interface CategoryCreatePayload {
  name: string;
  slug?: string;
  parentId?: string | null;
  brand?: string;
  productName?: string;
  productModel?: string;
  series?: string;
}

export interface CategoryUpdatePayload {
  name?: string;
  slug?: string;
  parentId?: string | null;
  brand?: string;
  productName?: string;
  productModel?: string;
  series?: string;
}

// ─── API calls ──────────────────────────────────────────────────────────────

/** Get category tree (default) or flat list (?flat=true). */
export function listCategories(flat?: boolean): Promise<CategoryNode[] | CategoryItem[]> {
  const qs = flat ? "?flat=true" : "";
  return apiFetch(`/api/categories${qs}`);
}

/** Get a single category by ID. */
export function getCategory(id: string): Promise<CategoryItem> {
  return apiFetch(`/api/categories/${id}`);
}

/** Create a new category. Requires MANAGER+ role. */
export function createCategory(data: CategoryCreatePayload): Promise<CategoryItem> {
  return apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Update a category. Requires MANAGER+ role. */
export function updateCategory(id: string, data: CategoryUpdatePayload): Promise<CategoryItem> {
  return apiFetch(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Delete a category. Requires MANAGER+ role. */
export function removeCategory(id: string): Promise<void> {
  return apiFetch(`/api/categories/${id}`, { method: "DELETE" });
}
