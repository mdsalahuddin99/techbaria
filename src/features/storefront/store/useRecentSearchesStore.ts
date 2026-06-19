import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 6;

interface RecentSearchesState {
  items: string[];
  push: (q: string) => void;
  clear: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      items: [],
      push: (q) =>
        set((s) => {
          const term = q.trim();
          if (!term) return s;
          const next = [term, ...s.items.filter((x) => x.toLowerCase() !== term.toLowerCase())];
          return { items: next.slice(0, MAX_RECENT) };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "storefront-recent-searches-v1" },
  ),
);
