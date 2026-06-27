import { useCallback, useEffect, useState } from "react";
import type { StorefrontOrder } from "../types";

const ORDERS_KEY = "storefront-orders-v1";

const readLocal = (): StorefrontOrder[] => {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as StorefrontOrder[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (orders: StorefrontOrder[]) => {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 200)));
  window.dispatchEvent(new CustomEvent("storefront-orders:change"));
};

/**
 * Merge API orders with localStorage orders.
 * API orders take precedence (same id), localStorage fills in old orders
 * that were placed before the API was connected.
 */
function mergeOrders(api: StorefrontOrder[], local: StorefrontOrder[]): StorefrontOrder[] {
  const map = new Map<string, StorefrontOrder>();
  for (const o of local) map.set(o.id, o);
  for (const o of api) map.set(o.id, o);
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Admin-side reader for online (storefront) orders.
 * Fetches from the real API and merges with localStorage orders for backward
 * compatibility (orders placed before API connection).
 */
export function useAdminStorefrontOrders(initialOrders?: StorefrontOrder[]) {
  const [orders, setOrders] = useState<StorefrontOrder[]>(initialOrders ?? []);
  const [loading, setLoading] = useState(!initialOrders);

  // Hydrate from localStorage on mount (client-only to avoid SSR mismatch)
  useEffect(() => {
    if (!initialOrders) {
      setOrders(readLocal());
    }
  }, [initialOrders]);

  // Fetch from API on mount
  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/storefront/orders?perPage=200");
        if (res.ok) {
          const data = await res.json();
          const apiOrders: StorefrontOrder[] = data.items ?? [];
          if (!cancelled) {
            const local = readLocal();
            const merged = mergeOrders(apiOrders, local);
            setOrders(merged);
            writeLocal(merged);
          }
        }
      } catch {
        // API unavailable — keep localStorage orders
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();

    // Also listen for localStorage changes (cross-tab sync)
    const refresh = () => {
      const local = readLocal();
      setOrders((prev) => mergeOrders(prev, local));
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("storefront-orders:change", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("storefront-orders:change", refresh);
    };
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: StorefrontOrder["status"]) => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );

      // Persist to localStorage
      const local = readLocal().map((o) => (o.id === id ? { ...o, status } : o));
      writeLocal(local);

      // Try API
      try {
        const res = await fetch(`/api/storefront/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          console.warn("Failed to update order status via API", await res.text().catch(() => ""));
        }
      } catch (err) {
        console.warn("Failed to update order status via API", err);
      }
    },
    [],
  );

  return { orders, loading, updateStatus };
}
