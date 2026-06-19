import { useCallback, useState } from "react";
import { useCartStore } from "../store/useCartStore";
import type { CheckoutAddress, ShippingMethod, StorefrontOrder, StorefrontPaymentMethod } from "../types";

const SHIPPING_RATES: Record<ShippingMethod, number> = {
  inside_dhaka: 70,
  outside_dhaka: 130,
  pickup: 0,
};

const ORDERS_KEY = "storefront-orders-v1";

const loadOrders = (): StorefrontOrder[] => {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as StorefrontOrder[]) : [];
  } catch {
    return [];
  }
};

export const persistOrder = (order: StorefrontOrder) => {
  const all = loadOrders();
  all.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(all.slice(0, 100)));
};

export const useStoredOrders = () => loadOrders();
export const getStoredOrder = (id: string) =>
  loadOrders().find((o) => o.id === id || o.orderNo === id) ?? null;

export const shippingCost = (m: ShippingMethod) => SHIPPING_RATES[m];

/**
 * Checkout submission. Tries the real API first; falls back to localStorage
 * if the backend is unreachable (offline / not yet deployed).
 */
export function useCheckout() {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(false);
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);

  const placeOrder = useCallback(
    async (input: {
      address: CheckoutAddress;
      shippingMethod: ShippingMethod;
      paymentMethod: StorefrontPaymentMethod;
      discount?: number;
    }): Promise<StorefrontOrder> => {
      setSubmitting(true);
      setApiError(false);
      try {
        try {
          // 1. Try real API
          const res = await fetch("/api/storefront/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
              discount: input.discount ?? 0,
              address: input.address,
              shippingMethod: input.shippingMethod,
              paymentMethod: input.paymentMethod,
            }),
          });

          if (res.ok) {
            const order: StorefrontOrder = await res.json();
            persistOrder(order);
            clear();
            return order;
          }

          // API returned error — log and fall through
          const errText = await res.text().catch(() => "");
          console.warn("Checkout API returned", res.status, errText);
          if (process.env.NODE_ENV === "production") {
            throw new Error(errText || "Checkout failed");
          }
        } catch (err) {
          console.warn("Checkout API unreachable", err);
          if (process.env.NODE_ENV === "production") {
            throw err instanceof Error ? err : new Error("Checkout API unreachable");
          }
        }

        // 2. Fallback: localStorage-only (offline / API unavailable)
        setApiError(true);
        const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
        const shipping = shippingCost(input.shippingMethod);
        const discount = input.discount ?? 0;
        const total = Math.max(0, subtotal + shipping - discount);
        const id = crypto.randomUUID();
        const orderNo = `AS-${Date.now().toString().slice(-6)}`;
        const order: StorefrontOrder = {
          id,
          orderNo,
          createdAt: new Date().toISOString(),
          items: lines,
          subtotal,
          shipping,
          discount,
          total,
          shippingMethod: input.shippingMethod,
          paymentMethod: input.paymentMethod,
          address: input.address,
          status: "pending",
        };
        persistOrder(order);
        clear();
        return order;
      } finally {
        setSubmitting(false);
      }
    }, [lines, clear]);

  return { placeOrder, submitting, apiError };
}
