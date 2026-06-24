"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { getStoredOrder, formatPrice, useSeo } from "@/features/storefront";
import type { StorefrontOrder } from "@/features/storefront/types";

export default function StorefrontOrderSuccess() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [order, setOrder] = useState<StorefrontOrder | null>(null);
  const [loading, setLoading] = useState(true);
  useSeo({ title: "Order confirmed — AmarShop" });

  useEffect(() => {
    if (!id) { setLoading(false); return; }

    // Try API first (authenticated user)
    fetch(`/api/storefront/my-orders`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          const found = data.find((o: any) => o.id === id);
          if (found) { setOrder(found); return; }
        }
        // Fallback to localStorage
        const stored = getStoredOrder(id);
        if (stored) setOrder(stored);
      })
      .catch(() => {
        const stored = getStoredOrder(id);
        if (stored) setOrder(stored);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
        <p className="text-sm text-slate-400 mt-3">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold mb-2">Order not found</h1>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 pt-8 sm:pt-12">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600/20 via-indigo-700/10 to-transparent border border-indigo-400/20 p-6 sm:p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 grid place-items-center mb-4">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Order confirmed!</h1>
        <p className="text-sm text-slate-300 mt-2">
          Thank you for shopping with AmarShop. We'll contact you shortly to confirm delivery.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/5 border border-white/10 text-sm">
          <Package className="h-4 w-4 text-indigo-300" />
          Order # <span className="font-mono font-semibold">{order.orderNo}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card/[0.04] border border-white/10 p-4 sm:p-5">
        <h2 className="text-base font-semibold mb-3">Items</h2>
        <div className="space-y-2 text-sm">
          {order.items.map((l) => (
            <div key={l.productId} className="flex items-center justify-between text-slate-300">
              <span>{l.name} × {l.qty}</span>
              <span className="text-white">{formatPrice(l.price * l.qty)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between text-slate-300"><span>Shipping</span><span>{formatPrice(order.shipping)}</span></div>
          <div className="flex justify-between text-base font-bold pt-1"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card/[0.04] border border-white/10 p-4 sm:p-5 text-sm">
        <h2 className="text-base font-semibold mb-2">Shipping to</h2>
        <div className="text-slate-300">
          <div className="text-white font-medium">{order.address.fullName}</div>
          <div>{order.address.phone}</div>
          <div>{order.address.address}, {order.address.city}{order.address.area ? `, ${order.address.area}` : ""}</div>
        </div>
      </div>

      <div className="mt-6 flex gap-3 justify-center">
        <Link href="/shop">
          <Button variant="ghost" className="rounded-full border border-white/10 text-white hover:bg-card/5">
            Continue shopping
          </Button>
        </Link>
        <Link href="/account">
          <Button className="bg-indigo-600 hover:bg-indigo-500 rounded-full">
            View my orders <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="h-12" />
    </div>
  );
}
