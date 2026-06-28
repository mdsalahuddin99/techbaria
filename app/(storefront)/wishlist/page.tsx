"use client";

import { useWishlistStore } from "@/features/storefront/store/useWishlistStore";
import { useStorefrontProducts } from "@/features/storefront/hooks/useStorefrontProducts";
import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";
import { useSeo } from "@/features/storefront";
import { Heart, Trash2 } from "lucide-react";
import Link from "next/link";

export default function StorefrontWishlist() {
  useSeo({ title: "Wishlist · AmarShop", description: "আপনার সংরক্ষিত পণ্যসমূহ" });
  const ids = useWishlistStore((s) => s.ids);
  const clear = useWishlistStore((s) => s.clear);
  const { all, isLoading } = useStorefrontProducts();
  const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as typeof all;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-[#1E3A5F]">
            <Heart className="h-6 w-6 text-rose-400 fill-rose-400" /> Wishlist
          </h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} saved {items.length === 1 ? "item" : "items"}</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1 font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {items.length === 0 && !isLoading ? (
        <div className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm p-10 text-center">
          <Heart className="h-12 w-12 mx-auto text-slate-400 mb-3" />
          <div className="text-[#1E3A5F] font-semibold">Wishlist এখনো খালি</div>
          <p className="text-sm text-slate-500 mt-1">পছন্দের পণ্য সেভ করতে heart আইকনে চাপুন।</p>
          <Link href="/shop" className="inline-block mt-5 px-5 h-10 leading-10 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold shadow-md shadow-green-500/20">
            Browse shop
          </Link>
        </div>
      ) : (
        <ProductGrid products={items} allProducts={all} loading={isLoading} />
      )}
    </div>
  );
}
