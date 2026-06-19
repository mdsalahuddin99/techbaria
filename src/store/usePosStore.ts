/**
 * POS store — UI session state only.
 *
 * Domain data (products, customers, sales, etc.) now comes from
 * TanStack Query + API Route Handlers. This store keeps only the
 * in-progress POS session: cart, held sales, selected customer,
 * discount, and active branch.
 *
 * Persisted to localStorage so a page refresh doesn't lose the cart.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PosStore } from "./types";
import { createUiSessionSlice } from "./slices";

export const usePosStore = create<PosStore>()(
  persist(
    (...a) => ({
      ...createUiSessionSlice(...a),
    }),
    {
      name: "shopflow-pos-ui-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        discount: state.discount,
        selectedCustomerId: state.selectedCustomerId,
        activeBranchId: state.activeBranchId,
      }),
    }
  )
);

export type { PosStore } from "./types";
