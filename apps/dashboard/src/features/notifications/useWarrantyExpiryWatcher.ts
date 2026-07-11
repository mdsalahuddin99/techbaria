import { useEffect } from "react";
import { useProductsQuery } from "@/features/products/hooks";
import { useNotificationActions } from "@/features/notifications/hooks";
import { getWarrantyStatus, NEAR_EXPIRY_DAYS } from "@/features/products/warranty";

const STORAGE_KEY = "warranty-notified-v1";

/**
 * Once per app boot, scan all products and queue an in-app notification for any
 * warranty that is either expired or expiring within the next 30 days.
 *
 * De-duplication: we persist a `${productId}:${monthKey}` set in localStorage
 * so the same product never fires twice in the same calendar month.
 */
export function useWarrantyExpiryWatcher() {
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
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    let dirty = false;

    for (const p of products) {
      const status = getWarrantyStatus(p);
      if (status.kind === "none") continue;
      const key = `${p.id}:${monthKey}:${status.kind}`;
      if (seen.has(key)) continue;

      if (status.kind === "expired") {
        push({
          type: "info",
          title: "Warranty expired",
          message: `${p.name} — warranty শেষ হয়েছে ${status.daysAgo} দিন আগে`,
          link: "/inventory",
        });
        seen.add(key);
        dirty = true;
      } else if (status.nearExpiry) {
        push({
          type: "info",
          title: "Warranty expiring soon",
          message: `${p.name} — ${status.daysLeft} দিনের মধ্যে warranty শেষ হবে (≤${NEAR_EXPIRY_DAYS}d)`,
          link: "/inventory",
        });
        seen.add(key);
        dirty = true;
      }
    }

    if (dirty) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
      } catch {
        // ignore quota errors
      }
    }
    // Run on mount only — products array changes during a session shouldn't
    // re-spam notifications.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
