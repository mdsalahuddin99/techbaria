import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shebatech360.com";

// ─── Static pages (always included) ──────────────────────────────────────────

const staticPages: MetadataRoute.Sitemap = [
  {
    url: `${BASE}/storefront`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${BASE}/storefront/shop`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${BASE}/storefront/cart`,
    lastModified: new Date(),
    changeFrequency: "never",
    priority: 0.3,
  },
  {
    url: `${BASE}/storefront/checkout`,
    lastModified: new Date(),
    changeFrequency: "never",
    priority: 0.2,
  },
  {
    url: `${BASE}/storefront/search`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.5,
  },
  {
    url: `${BASE}/storefront/wishlist`,
    lastModified: new Date(),
    changeFrequency: "never",
    priority: 0.3,
  },
  {
    url: `${BASE}/storefront/compare`,
    lastModified: new Date(),
    changeFrequency: "never",
    priority: 0.2,
  },
  {
    url: `${BASE}/landing`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE}/pricing`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${BASE}/login`,
    lastModified: new Date(),
    changeFrequency: "never",
    priority: 0.2,
  },
  {
    url: `${BASE}/register`,
    lastModified: new Date(),
    changeFrequency: "never",
    priority: 0.2,
  },
];

// ─── Dynamic product pages ──────────────────────────────────────────────────

async function getProductPages(): Promise<MetadataRoute.Sitemap> {
  try {
    // If no shop is seeded yet, return empty
    const shopId = process.env.DEFAULT_SHOP_ID;
    if (!shopId) return [];

    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    return products.map((p) => ({
      url: `${BASE}/storefront/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // If Prisma is not yet initialized or DB is empty, gracefully skip
    return [];
  }
}

// ─── Main sitemap ───────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productPages = await getProductPages();
  return [...staticPages, ...productPages];
}
