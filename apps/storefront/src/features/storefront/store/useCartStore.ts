import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "../types";

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

/**
 * Public storefront cart. Persisted to localStorage so guests don't lose
 * their basket on refresh. Separate from the POS admin cart by design.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === line.productId);
          const incQty = line.qty ?? 1;
          if (existing) {
            const next = Math.min(existing.qty + incQty, line.maxStock || Infinity);
            return {
              lines: s.lines.map((l) =>
                l.productId === line.productId ? { ...l, qty: next, maxStock: line.maxStock } : l,
              ),
            };
          }
          return {
            lines: [
              ...s.lines,
              {
                productId: line.productId,
                name: line.name,
                price: line.price,
                emoji: line.emoji,
                imageUrl: line.imageUrl,
                maxStock: line.maxStock,
                qty: Math.max(1, Math.min(incQty, line.maxStock || Infinity)),
              },
            ],
          };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          lines: s.lines
            .map((l) =>
              l.productId === productId
                ? { ...l, qty: Math.max(0, Math.min(qty, l.maxStock || Infinity)) }
                : l,
            )
            .filter((l) => l.qty > 0),
        })),
      remove: (productId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "storefront-cart-v1" },
  ),
);

export const useCartCount = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));

export const useCartSubtotal = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.qty * l.price, 0));
