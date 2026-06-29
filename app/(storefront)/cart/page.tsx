"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useCartStore, useCartSubtotal, useSeo } from "@/features/storefront";
import { CartLineItem } from "@/features/storefront/components/cart/CartLineItem";
import { CartSummary } from "@/features/storefront/components/cart/CartSummary";
import { useHydration } from "@/shared/hooks/useHydration";

export default function StorefrontCart() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartSubtotal();
  useSeo({ title: "Cart — AmarShop" });
  const isMounted = useHydration();

  if (!isMounted) return null;

  if (lines.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-slate-400 mb-3" />
        <h1 className="text-xl font-bold mb-2 text-[#1E3A5F]">Your cart is empty</h1>
        <p className="text-sm text-slate-500 mb-6">কেনার জন্য কিছু পণ্য যোগ করুন।</p>
        <Link href="/shop">
          <Button className="bg-[#16A34A] hover:bg-[#15803D] rounded-full text-white shadow-md shadow-green-500/20">
            Continue shopping <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-[#1E3A5F]">Your cart</h1>
      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {lines.map((l) => (
            <CartLineItem key={l.productId} line={l} />
          ))}
        </div>
        <aside className="space-y-3">
          <CartSummary subtotal={subtotal} total={subtotal} />
          <Link href="/checkout">
            <Button className="w-full h-11 bg-[#16A34A] hover:bg-[#15803D] rounded-full text-white shadow-md shadow-green-500/20">
              Checkout <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline" className="w-full h-11 rounded-full border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F8FAFC]">
              Continue shopping
            </Button>
          </Link>
        </aside>
      </div>
      <div className="h-12" />
    </div>
  );
}
