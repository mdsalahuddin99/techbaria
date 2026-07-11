import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { deriveFeaturedProducts } from "../../hooks/useStorefrontProducts";
import { ProductGrid } from "../product/ProductGrid";
import type { StorefrontProduct } from "@/features/storefront/types";

interface Props {
  products: StorefrontProduct[];
}

export function FeaturedProducts({ products: allProducts }: Props) {
  const featured = deriveFeaturedProducts(allProducts, 8);

  return (
    <section className="bg-background py-16 sm:py-24 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Featured Products
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Hand-picked premium tech for you
              </p>
            </div>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-all duration-200 group"
          >
            Explore Collection <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <ProductGrid products={featured} allProducts={allProducts} loading={false} />

        {/* Mobile View All */}
        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center w-full gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
          >
            View All Products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
