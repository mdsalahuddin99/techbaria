import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { productsService } from "@/server/services/productsService";
import { ProductDetailClient } from "@/features/storefront/components/product/ProductDetailClient";

export const revalidate = 300; // 5 minutes ISR caching

export default async function StorefrontProduct({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  try {
    // 1. Fetch main product
    const product = await productsService.getBySlug(slug);

    return (
      <ProductDetailClient product={product}>
        {product.category && (
          <Suspense fallback={
            <section className="mt-16">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">You May Also Like</h2>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              <div className="h-40 flex items-center justify-center text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading related products...
              </div>
            </section>
          }>
            <RelatedProducts category={product.category} excludeId={product.id} />
          </Suspense>
        )}
      </ProductDetailClient>
    );
  } catch (err) {
    console.error("Product not found:", err);
    notFound();
  }
}

import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";

async function RelatedProducts({ category, excludeId }: { category: string; excludeId: string }) {
  const related = await productsService.publicStorefrontList({
    category,
    excludeId,
    limit: 6,
  });

  if (!related || related.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">You May Also Like</h2>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>
      <ProductGrid products={related} allProducts={related} loading={false} />
    </section>
  );
}
