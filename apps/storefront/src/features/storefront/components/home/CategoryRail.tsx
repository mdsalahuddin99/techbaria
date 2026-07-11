"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Grid } from "lucide-react";
import { deriveCategories } from "../../hooks/useStorefrontCategories";
import type { StorefrontProduct } from "@/features/storefront/types";

interface Props {
  products: StorefrontProduct[];
  realCategories?: any[];
}

export function CategoryRail({ products, realCategories = [] }: Props) {
  const derivedCategories = deriveCategories(products);
  if (!derivedCategories.length) return null;

  // Merge real categories with derived ones
  const categories = derivedCategories.map(c => {
    const real = realCategories.find(r => r.name === c.label);
    return {
      ...c,
      imageUrl: real?.imageUrl,
    };
  });

  return (
    <section className="bg-muted/30 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Grid className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Shop by Category
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                আপনার পছন্দের ক্যাটাগরি বেছে নিন
              </p>
            </div>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-all duration-200 group"
          >
            View All <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {categories.slice(0, 8).map((c, i) => (
            <Link
              key={c.value}
              href={`/shop/${encodeURIComponent(c.value)}`}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-background transition-all duration-300 hover:-translate-y-1.5 border border-transparent hover:border-primary/20 shadow-sm hover:shadow-xl"
              style={{
                animationDelay: `${i * 0.05}s`,
              }}
            >
              {/* Icon area */}
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110 bg-primary/5"
              >
                {/* Hover overlay gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0 bg-gradient-to-br from-primary/20 to-primary/5"
                />
                
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt={c.label} fill sizes="(max-width: 768px) 56px, 64px" className="object-contain p-2 z-10" />
                ) : (
                  <c.icon
                    className="h-8 w-8 relative z-10 transition-colors duration-300 text-primary group-hover:text-primary/80"
                  />
                )}
              </div>

              {/* Label */}
              <div className="text-center">
                <div
                  className="text-xs font-bold leading-tight transition-colors duration-200 group-hover:text-primary text-foreground"
                >
                  {c.label}
                </div>
                <div
                  className="text-[10px] mt-1 text-muted-foreground font-medium"
                >
                  {c.count} items
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile "View All" */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center w-full gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
          >
            View All Categories <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
