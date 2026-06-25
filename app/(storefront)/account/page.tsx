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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-[#1E3A5F]">My account</h1>
        <div className="text-center py-20 text-slate-500 text-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#2563EB] mb-3" />
          Loading your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-[#1E3A5F]">My account</h1>

      <section className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#1E3A5F]">
          <Package className="h-4 w-4 text-[#2563EB]" /> Order history
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            <ShoppingBag className="h-10 w-10 mx-auto text-slate-400 mb-2" />
            You have no orders yet.
            <div className="mt-3">
              <Link href="/shop" className="font-bold text-[#2563EB] hover:text-[#1D4ED8]">Start shopping →</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/storefront/order/${o.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB]/40 transition"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1E3A5F]">#{o.orderNo}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString("en-BD")} · {o.items.length} items · {o.status}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-[#2563EB]">{formatPrice(o.total)}</div>
                  <div className={`text-xs ${o.status === "delivered" ? "text-emerald-600" : o.status === "cancelled" ? "text-red-500" : "text-amber-600"}`}>
                    {o.status}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Account info */}
      <section className="mt-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
        <h2 className="text-base font-semibold mb-2 text-[#1E3A5F]">Account info</h2>
        <p className="text-sm text-slate-500">
          Registered as a storefront customer. Contact the shop for any order-related inquiries.
        </p>
      </section>

      <div className="h-12" />
    </div>
  );
}
