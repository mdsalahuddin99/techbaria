/**
 * Products service — Prisma-backed, framework-agnostic.
 *
 * Every query is scoped by `ctx.shopId` (multi-tenant).
 * Never imports Next.js — only Prisma + shared validators.
 */
import "server-only";

import {
  list,
  getById,
  getBySlug,
  publicList,
  publicStorefrontList,
  lowStock,
  outOfStock,
  distinctFieldValues,
} from "./products/queries";
import { create } from "./products/create";
import { update } from "./products/update";
import { remove } from "./products/remove";

export { serialise, serialiseOne } from "./products/serialiser";

export type {
  ProductListFilter,
  ProductCreateInput,
  ProductUpdateInput,
} from "./products/types";

// ─── Service ────────────────────────────────────────────────────────────────

export const productsService = {
  /** List products with optional search, category filter & pagination. */
  list,

  /** Get a single product by ID (scoped to shop). */
  getById,

  /** Get a product by slug (for storefront). */
  getBySlug,

  /** List published products for public storefront (backward-compat). */
  publicList,

  /**
   * Lean storefront list — public-safe fields only, supports category/search/excludeId/limit.
   * Use this for all new storefront API routes.
   */
  publicStorefrontList,

  /** Create a new product. Requires MANAGER+. */
  create,

  /** Update an existing product. Requires MANAGER+. */
  update,

  /** Delete a product. Requires OWNER.
   *  Blocked if the product has existing purchase history, sales, or serials
   *  to prevent data integrity loss.  */
  remove,

  /** Products where stock ≤ reorderLevel. */
  lowStock,

  /** Products where stock = 0. */
  outOfStock,

  /** Distinct non-null values for a given text field across all shop products. */
  distinctFieldValues,
};
