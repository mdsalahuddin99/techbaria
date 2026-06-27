export const runtime = "nodejs";

import { publicApiHandler } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";

/**
 * GET /api/storefront/products
 *
 * Returns the public product catalog using the lean storefront serialiser.
 * Sensitive fields (cost, wholesalePrice, supplierId) are NEVER returned.
 *
 * Query params:
 *   category   – filter by category name
 *   search     – text search (name, sku, brand)
 *   excludeId  – exclude a product ID (used for PDP "related" queries)
 *   limit      – max results (used for "related" queries)
 *
 * Cache: s-maxage=60 (Vercel/CDN edge cache), stale-while-revalidate=300
 */
export const GET = publicApiHandler(async (req: Request) => {
  const url = new URL(req.url);
  const category   = url.searchParams.get("category")   ?? undefined;
  const search     = url.searchParams.get("search")     ?? undefined;
  const excludeId  = url.searchParams.get("excludeId")  ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit      = limitParam ? parseInt(limitParam, 10) : undefined;

  const data = await productsService.publicStorefrontList({
    category,
    search,
    excludeId,
    limit,
  });

  // HTTP cache: 60s fresh on CDN/Vercel edge, up to 5min stale-while-revalidate
  // This alone eliminates repeated DB round-trips for the same data.
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
});
