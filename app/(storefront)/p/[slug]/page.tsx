import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { productsService } from "@/server/services/productsService";
import { ProductDetailClient } from "@/features/storefront/components/product/ProductDetailClient";

import { prisma } from "@/server/db/client";

export const revalidate = 300; // 5 minutes ISR caching

const getProduct = cache(async (slug: string) => {
  return await productsService.getBySlug(slug);
});

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    select: { slug: true },
    take: 100, // Pre-render top 100 products to avoid huge build times
  });

  return products.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    const title = `${product.name} — AmarShop`;
    const desc = `${product.name}${product.brand ? ` by ${product.brand}` : ""} — ৳${product.price}.`;
    const image = product.images?.[0] || product.imageUrl;

    return {
      title,
      description: desc,
      openGraph: {
        title: product.name,
        description: product.description || desc,
        images: image ? [{ url: image }] : [],
      },
    };
  } catch {
    return { title: "Product Not Found" };
  }
}

export default async function StorefrontProduct({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  try {
    // 1. Fetch main product
    const product = await getProduct(slug);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: product.images?.[0] || product.imageUrl,
      description: product.description || `Buy ${product.name} at the best price.`,
      sku: product.sku || product.id,
      brand: {
        "@type": "Brand",
        name: product.brand || "AmarShop",
      },
      offers: {
        "@type": "Offer",
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://pos99.vercel.app'}/p/${product.slug || product.id}`,
        priceCurrency: "BDT",
        price: product.price,
        itemCondition: "https://schema.org/NewCondition",
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductDetailClient product={product}>
        {product.category && (
          <Suspense fallback={
            <section className="mt-16">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">You May Also Like</h2>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
                ))}
              </div>
            </section>
          }>
            <RelatedProducts category={product.category} excludeId={product.id} />
          </Suspense>
        )}
      </ProductDetailClient>
      </>
    );
  } catch (err) {
    console.error("Product not found:", err);
    notFound();
  }
}

import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";

async function RelatedProducts({ category, excludeId }: { category: string; excludeId: string }) {
  const { items: related } = await productsService.publicStorefrontList({
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
