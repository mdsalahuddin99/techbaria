import { notFound } from "next/navigation";
import { productsService } from "@/server/services/productsService";
import { ProductDetailClient } from "@/features/storefront/components/product/ProductDetailClient";

export default async function StorefrontProduct({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  try {
    // 1. Fetch main product
    const product = await productsService.getBySlug(slug);

    // 2. Fetch related products (same category)
    let related = [];
    if (product.category) {
      related = await productsService.publicStorefrontList({
        category: product.category,
        excludeId: product.id,
        limit: 6,
      });
    }

    return <ProductDetailClient product={product} related={related} />;
  } catch (err) {
    console.error("Product not found:", err);
    notFound();
  }
}
