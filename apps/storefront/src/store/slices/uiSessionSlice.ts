/**
 * UI session slice — the only slice that survives the Next.js migration.
 *
 * Keeps in-progress POS cart, held sales, customer selection, and discount
 * in Zustand with localStorage persistence.
 * Everything else (domain data) comes from TanStack Query + API.
 */
import type { SliceCreator, CartItem } from "../types";

let idCounter = 1;
const uid = () => `ui-${++idCounter}-${Date.now()}`;

export const createUiSessionSlice: SliceCreator<import("../types").UiSessionSlice> = (set, get) => ({
  // ─── State ──────────────────────────────────────────────────────────────
  cart: [],
  discount: 0,
  selectedCustomerId: null,

  // ─── Cart actions ───────────────────────────────────────────────────────
  addToCart(productId, name?, price?, imageUrl?) {
    const { cart } = get();
    const existing = cart.find((c: CartItem) => c.productId === productId);
    if (existing) {
      set({ cart: cart.map((c: CartItem) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c)) });
      return;
    }
    set({
      cart: [
        ...cart,
        {
          id: uid(),
          productId,
          name: name ?? "Unknown",
          price: price ?? 0,
          qty: 1,
          imageUrl: imageUrl ?? undefined,
        },
      ],
    });
  },

  setQty(productId, qty) {
    set({
      cart: get().cart.map((c) => (c.productId === productId ? { ...c, qty: Math.max(0, qty) } : c)).filter((c) => c.qty > 0),
    });
  },

  setCartItemWarranty(productId, months) {
    set({
      cart: get().cart.map((c) => (c.productId === productId ? { ...c, warrantyMonths: months } : c)),
    });
  },

  setCartItemSerials(productId, serials) {
    set({
      cart: get().cart.map((c) => (c.productId === productId ? { ...c, serials } : c)),
    });
  },

  removeFromCart(productId) {
    set({ cart: get().cart.filter((c) => c.productId !== productId) });
  },

  clearCart() {
    set({ cart: [], discount: 0, selectedCustomerId: null });
  },

  restoreCart(saved) {
    set({ cart: saved.cart, discount: saved.discount, selectedCustomerId: saved.selectedCustomerId });
  },

  setDiscount(n) {
    set({ discount: n });
  },

  setSelectedCustomer(id) {
    set({ selectedCustomerId: id });
  },


});
