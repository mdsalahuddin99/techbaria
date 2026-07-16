import type { Product } from "./types";

/** Default reorder threshold when minStock is missing/invalid. */
export const DEFAULT_MIN_STOCK = 5;

/** Coerce any value to a safe non-negative integer; falls back on NaN/undefined/null. */
export function safeMinStock(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/**
 * Compute the effective stock of a bundle: how many full bundles can be
 * assembled from current component stock. Returns the product's own stock for
 * non-bundle products.
 */
export function bundleAvailableStock(bundle: Product, allProducts: Product[]): number {
  return bundle.stock;
}

/**
 * Effective reorder threshold — uses `minStock` as the single source of truth.
 * Handles undefined / NaN / negative values defensively.
 */
export function effectiveReorderPoint(p: Product): number {
  return safeMinStock(p?.minStock, 0);
}

/**
 * Suggested PO quantity when a product hits its reorder point.
 * Formula: max(reorder * 2 - stock, reorder), with a minimum of 1.
 */
export function suggestedPoQty(p: Product): number {
  const reorder = effectiveReorderPoint(p);
  const stock = safeMinStock(p?.stock, 0);
  return Math.max(1, reorder * 2 - stock, reorder);
}
