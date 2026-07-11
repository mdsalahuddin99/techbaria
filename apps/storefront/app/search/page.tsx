"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useStorefrontProducts, useSeo } from "@/features/storefront";
import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";

function StorefrontSearchInner() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const { products, all, isLoading } = useStorefrontProducts({ search: q, sort: "popular" });

  useSeo({
    title: `Search “${q}” — AmarShop`,
    description: `Search results for ${q}.`,
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E3A5F]">
        Search results
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
        “{q}” — {products.length} products
      </p>
      <ProductGrid
        products={products}
        allProducts={all}
        loading={isLoading}
        emptyHint="কোনো রেজাল্ট পাওয়া যায়নি। অন্য কিছু লিখে দেখুন।"
      />
      <div className="h-12" />
    </div>
  );
}

export default function StorefrontSearch() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Searching...</div>}>
      <StorefrontSearchInner />
    </Suspense>
  );
}
