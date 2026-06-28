"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, ChevronRight, ShoppingBag, Loader2, User, Mail } from "lucide-react";
import { formatPrice, useSeo } from "@/features/storefront";
import type { StorefrontOrder } from "@/features/storefront/types";
import { useSession, signOut } from "next-auth/react";

export default function StorefrontAccount() {
  const { data: session } = useSession();
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
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#16A34A] mb-3" />
          Loading your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-[#1E3A5F]">My account</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Account info (Left Side on Desktop) */}
        <div className="md:w-1/3 shrink-0">
          <section className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
            <h2 className="text-base font-semibold mb-4 text-[#1E3A5F]">Account info</h2>
            
            {session?.user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="h-10 w-10 rounded-full bg-[#E2E8F0] flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">{session.user.name || "Customer"}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{session.user.email}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition mt-2"
                >
                  Log out
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Registered as a storefront customer. Contact the shop for any order-related inquiries.
              </p>
            )}
          </section>
        </div>

        {/* Order History (Right Side on Desktop) */}
        <div className="md:w-2/3">
          <section className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-4 sm:p-5 h-full">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#1E3A5F]">
              <Package className="h-4 w-4 text-[#16A34A]" /> Order history
            </h2>

            {orders.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                <ShoppingBag className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                You have no orders yet.
                <div className="mt-3">
                  <Link href="/shop" className="font-bold text-[#16A34A] hover:text-[#15803D]">Start shopping →</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/storefront/order/${o.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#16A34A]/40 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1E3A5F]">#{o.orderNo}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString("en-BD")} · {o.items.length} items · {o.status}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#16A34A]">{formatPrice(o.total)}</div>
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
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
