import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useFeaturedProducts, useStorefrontProducts } from "../../hooks/useStorefrontProducts";
import { ProductGrid } from "../product/ProductGrid";

export function FeaturedProducts() {
  const featured = useFeaturedProducts(8);
  const { all, isLoading } = useStorefrontProducts();

  return (
    <section className="py-10 sm:py-14 border-t border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm" />
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Featured Products</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Hand-picked premium tech for you</p>
            </div>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductGrid products={featured} allProducts={all} loading={isLoading} />
      </div>
    </section>
  );
}
