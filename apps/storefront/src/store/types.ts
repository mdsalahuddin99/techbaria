import type { StateCreator } from "zustand";

// ─── UI session state — survives migration ──────────────────────────────────

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
  warrantyMonths?: number;
  serials?: string[];
}

export interface UiSessionSlice {
  cart: CartItem[];
  discount: number;
  selectedCustomerId: string | null;
  addToCart: (productId: string, name?: string, price?: number, imageUrl?: string) => void;
  setQty: (productId: string, qty: number) => void;
  setCartItemWarranty: (productId: string, months: number | undefined) => void;
  setCartItemSerials: (productId: string, serials: string[]) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  /** Restore a previously saved cart — used for optimistic rollback on checkout failure. */
  restoreCart: (state: { cart: CartItem[]; discount: number; selectedCustomerId: string | null }) => void;
  setDiscount: (n: number) => void;
  setSelectedCustomer: (id: string | null) => void;
}

export type PosStore = UiSessionSlice;
export type SliceCreator<T> = StateCreator<PosStore, [], [], T>;
