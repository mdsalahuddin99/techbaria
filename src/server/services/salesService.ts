/**
 * Sales service — Prisma-backed, framework-agnostic.
 *
 * Handles POS + Storefront sales, refunds, voids.
 * Multi-step writes use `prisma.$transaction` for atomicity.
 * All public methods return serialized DTOs (not raw Prisma).
 */
import "server-only";

import { list, getById, byCustomer } from "./sales/queries";
import { create } from "./sales/create";
import { voidSale } from "./sales/void";
import { refund } from "./sales/refund";
import { remove } from "./sales/remove";
import { update } from "./sales/update";
import {
  createStorefrontOrder,
  listStorefrontOrders,
  updateStorefrontOrderStatus,
  getStorefrontOrder,
} from "./sales/storefront";

export type {
  SaleCreateInput,
  SaleUpdateInput,
  SaleListFilter,
  RefundInput,
  StorefrontOrderCreateInput,
  StorefrontOrderStatus,
} from "./sales/types";

// ─── Service ────────────────────────────────────────────────────────────────

export const salesService = {
  /** List sales with optional filters (paginated). */
  list,

  /** Get a single sale by ID. */
  getById,

  /** Create a new sale — validates stock → creates records → assigns serials → logs. */
  create,

  /** Void (cancel) a sale — restores stock and reverses customer due. Requires MANAGER+. */
  void: voidSale,

  /** Refund a sale (partial or full). Requires MANAGER+. */
  refund,

  /** Permanently delete a completed sale — restores stock, serials, and customer due. Requires MANAGER+. */
  remove,

  /** Update a completed sale — replaces items, tenders, and syncs stock/serials. Requires MANAGER+. */
  update,

  /** Get sales for a specific customer. */
  byCustomer,

  // ─── Storefront order delegation ───────────────────────────────────────────

  createStorefrontOrder,
  listStorefrontOrders,
  updateStorefrontOrderStatus,
  getStorefrontOrder,
};
