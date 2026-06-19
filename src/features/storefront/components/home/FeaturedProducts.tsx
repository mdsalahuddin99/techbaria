import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useFeaturedProducts, useStorefrontProducts } from "../../hooks/useStorefrontProducts";
import { ProductGrid } from "../product/ProductGrid";

export function FeaturedProducts() {
  const featured = useFeaturedProducts(8);
  const { all, isLoading } = useStorefrontProducts();

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-10 sm:pt-14">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold italic tracking-tighter">Featured</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Hand-picked premium tech for you</p>
        </div>
        <Link href="/storefront/shop" className="text-xs sm:text-sm text-indigo-300 inline-flex items-center gap-1">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <ProductGrid products={featured} allProducts={all} loading={isLoading} />
    </section>
  );
}
