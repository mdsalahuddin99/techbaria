/**
 * Purchases service — Prisma-backed, framework-agnostic.
 *
 * Handles purchase orders, receiving, and supplier payments.
 * All public methods return serialized DTOs (not raw Prisma).
 */
import "server-only";

import { list, getById, listBySupplier } from "./purchases/queries";
import { create } from "./purchases/create";
import { update } from "./purchases/update";
import { remove } from "./purchases/remove";
import { addPayment, deletePayment } from "./purchases/payment";
import {
  listRestocks,
  createRestockDraft,
  updateRestockItem,
  removeRestockItem,
  confirmRestock,
  removeRestock,
} from "./purchases/restocks";

export type { PurchaseCreateInput, PurchaseUpdateInput } from "./purchases/types";

// ─── Service ────────────────────────────────────────────────────────────────

export const purchasesService = {
  /** List all purchases for the shop (paginated). */
  list,

  /** Get purchases by supplier (up to last 20 POs). */
  listBySupplier,

  /** Get a single purchase by ID. */
  getById,

  /** Create a new purchase order. Requires MANAGER+. */
  create,

  /** Record a payment against an existing purchase. */
  addPayment,

  /** Delete a payment from an existing purchase. */
  deletePayment,

  /** Delete a purchase. Requires MANAGER+.
   *  Blocked if any items exist — the purchase has already affected inventory. */
  remove,

  /** Edit a purchase — updates stock, serials, and all line items. */
  update,

  // Restock operations
  listRestocks,
  createRestockDraft,
  updateRestockItem,
  removeRestockItem,
  confirmRestock,
  removeRestock,
};
