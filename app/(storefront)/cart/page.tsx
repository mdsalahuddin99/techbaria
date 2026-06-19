"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useCartStore, useCartSubtotal, useSeo } from "@/features/storefront";
import { CartLineItem } from "@/features/storefront/components/cart/CartLineItem";
import { CartSummary } from "@/features/storefront/components/cart/CartSummary";

export default function StorefrontCart() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartSubtotal();
  useSeo({ title: "Cart — AmarShop" });

  if (lines.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-slate-600 mb-3" />
        <h1 className="text-xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-sm text-slate-400 mb-6">কেনার জন্য কিছু পণ্য যোগ করুন।</p>
        <Link href="/storefront/shop">
          <Button className="bg-indigo-600 hover:bg-indigo-500 rounded-full">
            Continue shopping <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">Your cart</h1>
      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {lines.map((l) => (
            <CartLineItem key={l.productId} line={l} />
          ))}
        </div>
        <aside className="space-y-3">
          <CartSummary subtotal={subtotal} total={subtotal} />
          <Link href="/storefront/checkout">
            <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-600/30">
              Checkout <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/storefront/shop">
            <Button variant="ghost" className="w-full h-11 rounded-full border border-white/10 text-slate-200 hover:bg-card/5">
              Continue shopping
            </Button>
          </Link>
        </aside>
      </div>
      <div className="h-12" />
    </div>
  );
}
