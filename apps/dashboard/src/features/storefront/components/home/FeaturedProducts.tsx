import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { deriveFeaturedProducts } from "../../hooks/useStorefrontProducts";
import { ProductGrid } from "../product/ProductGrid";
import type { StorefrontProduct } from "@/features/storefront/types";

interface Props {
  products: StorefrontProduct[];
}

export function FeaturedProducts({ products: allProducts }: Props) {
  const featured = deriveFeaturedProducts(allProducts, 8);

  return (
    <section className="sf-section-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="sf-section-accent" />
            <div>
              <h2 className="sf-section-title">Featured Products</h2>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                Hand-picked premium tech for you
              </p>
            </div>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold transition-all duration-200 hover:-translate-x-0.5"
            style={{ color: "#16A34A" }}
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <ProductGrid products={featured} allProducts={allProducts} loading={false} />

        {/* Mobile View All */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] text-sm font-bold text-white transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
              boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
            }}
          >
            View All Products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
