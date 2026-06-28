import { notFound } from "next/navigation";
import { productsService } from "@/server/services/productsService";
import { ProductDetailClient } from "@/features/storefront/components/product/ProductDetailClient";

export const revalidate = 300; // 5 minutes ISR caching

export default async function StorefrontProduct({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  try {
    // 1. Fetch main product
    const product = await productsService.getBySlug(slug);

    // 2. Fetch related products asynchronously (non-blocking)
    const relatedPromise = product.category 
      ? productsService.publicStorefrontList({
          category: product.category,
          excludeId: product.id,
          limit: 6,
        })
      : Promise.resolve([]);

    return <ProductDetailClient product={product} relatedPromise={relatedPromise} />;
  } catch (err) {
    console.error("Product not found:", err);
    notFound();
  }
}
