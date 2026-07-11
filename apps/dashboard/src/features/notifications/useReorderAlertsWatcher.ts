import { useEffect } from "react";
import { useProductsQuery } from "@/features/products/hooks";
import { useNotificationActions } from "@/features/notifications/hooks";
import { effectiveReorderPoint, bundleAvailableStock } from "@/features/products/bundle";

const STORAGE_KEY = "reorder-notified-v1";

/**
 * Per-day low-stock / reorder watcher. Pushes one notification per product
 * per calendar day when its stock drops to or below the reorder point.
 * Bundle products use derived stock; simple products use `product.stock`.
 */
export function useReorderAlertsWatcher() {
  const { data } = useProductsQuery();
  const products = ((data as any)?.items ?? []) as any[];
  const { push } = useNotificationActions();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let seen: Set<string>;
    try {
      seen = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      seen = new Set();
    }
    const dayKey = new Date().toISOString().slice(0, 10);
    let dirty = false;

    for (const p of products) {
      if (!p.active) continue;
      const reorder = effectiveReorderPoint(p);
      if (reorder <= 0) continue;
      const stock = p.type === "bundle" ? bundleAvailableStock(p, products) : p.stock;
      if (stock > reorder) continue;

      const key = `${p.id}:${dayKey}`;
      if (seen.has(key)) continue;
      push({
        type: "low_stock",
        title: stock <= 0 ? "Out of stock" : "Reorder needed",
        message: `${p.name} — ${stock} ${p.unit} (reorder ≤ ${reorder})`,
        link: "/inventory",
      });
      seen.add(key);
      dirty = true;
    }

    if (dirty) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
      } catch {
        // ignore quota errors
      }
    }
    // Mount-only — avoid spamming on every stock change in the same session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
