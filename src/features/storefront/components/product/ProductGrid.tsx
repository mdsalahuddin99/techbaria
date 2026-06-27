import type { StorefrontProduct } from "@/features/storefront/types";
import { ProductCard } from "./ProductCard";

interface Props {
  products: StorefrontProduct[];
  allProducts: StorefrontProduct[];
  emptyHint?: string;
  loading?: boolean;
}

export function ProductGrid({ products, allProducts, emptyHint, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-card/[0.04] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        {emptyHint ?? "কোনো পণ্য পাওয়া যায়নি।"}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} allProducts={allProducts} />
      ))}
    </div>
  );
}
