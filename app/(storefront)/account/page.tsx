"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, ChevronRight, ShoppingBag, Loader2 } from "lucide-react";
import { formatPrice, useSeo } from "@/features/storefront";
import type { StorefrontOrder } from "@/features/storefront/types";

export default function StorefrontAccount() {
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [loading, setLoading] = useState(true);
  useSeo({ title: "My account — AmarShop" });

  useEffect(() => {
    let cancelled = false;

    // Try fetching from API (authenticated VIEWER user's own orders)
    fetch("/api/storefront/my-orders")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data)) {
          setOrders(data);
        }
      })
      .catch(() => {
        // Silent — fall back to localStorage below
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">My account</h1>
        <div className="text-center py-20 text-slate-400 text-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400 mb-3" />
          Loading your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">My account</h1>

      <section className="rounded-2xl bg-card/[0.04] border border-white/10 p-4 sm:p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-indigo-300" /> Order history
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <ShoppingBag className="h-10 w-10 mx-auto text-slate-600 mb-2" />
            You have no orders yet.
            <div className="mt-3">
              <Link href="/storefront/shop" className="text-indigo-300 hover:text-indigo-200">Start shopping →</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/storefront/order/${o.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card/[0.03] border border-white/5 hover:border-indigo-400/40 transition"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">#{o.orderNo}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(o.createdAt).toLocaleDateString("en-BD")} · {o.items.length} items · {o.status}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white">{formatPrice(o.total)}</div>
                  <div className={`text-xs ${o.status === "delivered" ? "text-emerald-400" : o.status === "cancelled" ? "text-red-400" : "text-amber-400"}`}>
                    {o.status}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Account info */}
      <section className="mt-6 rounded-2xl bg-card/[0.04] border border-white/10 p-4 sm:p-5">
        <h2 className="text-base font-semibold mb-2">Account info</h2>
        <p className="text-sm text-slate-400">
          Registered as a storefront customer. Contact the shop for any order-related inquiries.
        </p>
      </section>

      <div className="h-12" />
    </div>
  );
}
