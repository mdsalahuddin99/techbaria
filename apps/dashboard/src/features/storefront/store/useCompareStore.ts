import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_COMPARE = 4;

interface CompareState {
  ids: string[];
  toggle: (id: string) => boolean; // returns false if cap hit
  has: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const cur = get().ids;
        if (cur.includes(id)) {
          set({ ids: cur.filter((x) => x !== id) });
          return true;
        }
        if (cur.length >= MAX_COMPARE) return false;
        set({ ids: [...cur, id] });
        return true;
      },
      has: (id) => get().ids.includes(id),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    { name: "storefront-compare-v1" },
  ),
);

export const useCompareCount = () => useCompareStore((s) => s.ids.length);
export const COMPARE_MAX = MAX_COMPARE;
