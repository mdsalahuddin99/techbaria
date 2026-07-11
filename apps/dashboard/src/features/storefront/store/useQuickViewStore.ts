import { create } from "zustand";

interface QuickViewState {
  productId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useQuickViewStore = create<QuickViewState>((set) => ({
  productId: null,
  open: (id) => set({ productId: id }),
  close: () => set({ productId: null }),
}));
