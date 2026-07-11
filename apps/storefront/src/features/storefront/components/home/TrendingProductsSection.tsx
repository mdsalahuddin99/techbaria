"use client";

import Link from "next/link";
import { Sparkles, ChevronRight, TrendingUp } from "lucide-react";
import { deriveTrendingProducts } from "../../hooks/useStorefrontProducts";
import type { StorefrontProduct } from "@/features/storefront/types";
import { ProductCard } from "../product/ProductCard";

interface Props {
  products: StorefrontProduct[];
}

export function TrendingProductsSection({ products: allProducts }: Props) {
  const products = deriveTrendingProducts(allProducts, 6);

  if (!products.length) return null;

  return (
    <section className="relative overflow-hidden py-12 sm:py-16 bg-emerald-50/50 dark:bg-emerald-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            {/* Sparkle icon box */}
            <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
              <TrendingUp className="h-7 w-7 text-emerald-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Trending Now
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <Sparkles className="h-3.5 w-3.5 fill-current" /> HOT
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Most popular items people are loving right now</p>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2">
            <Link
              href="/shop?sort=popular"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-semibold transition-colors group"
            >
              View All <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Products scroll row */}
        <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-6 pt-2 snap-x">
          {products.map((p, i) => (
            <div key={p.id} className="w-[220px] sm:w-[240px] shrink-0 snap-start" style={{ animationDelay: `${i * 100}ms` }}>
              <ProductCard product={p} allProducts={allProducts} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
