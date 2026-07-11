"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, ChevronRight, Zap } from "lucide-react";
import { deriveFlashDeals } from "../../hooks/useStorefrontProducts";
import type { StorefrontProduct } from "@/features/storefront/types";
import { ProductCard } from "../product/ProductCard";

interface Props {
  products: StorefrontProduct[];
}

export function FlashDealsSection({ products: allProducts }: Props) {
  const products = deriveFlashDeals(allProducts, 6);
  const [endsIn, setEndsIn] = useState({ h: 5, m: 42, s: 18 });

  useEffect(() => {
    const t = setInterval(() => {
      setEndsIn((p) => {
        let { h, m, s } = p;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!products.length) return null;

  return (
    <section className="relative overflow-hidden py-12 sm:py-16 bg-red-50/50 dark:bg-red-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            {/* Flame icon box */}
            <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
              <Flame className="h-7 w-7 text-orange-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Flash Deals
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                  <Zap className="h-3.5 w-3.5 fill-current" /> LIVE
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Limited time offers you can't miss</p>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2">
            {/* Countdown */}
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2 shadow-sm">
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mr-2 hidden sm:block">Ends In</span>
              {[endsIn.h, endsIn.m, endsIn.s].map((n, i, arr) => (
                <div key={i} className="flex items-center">
                  <div className="bg-muted rounded-md px-2 py-1 min-w-[32px] text-center">
                    <span className="text-foreground font-mono font-bold text-lg">{String(n).padStart(2, "0")}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-muted-foreground font-bold mx-1.5 animate-pulse">:</span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/shop"
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
