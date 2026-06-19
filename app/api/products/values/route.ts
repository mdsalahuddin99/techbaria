export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/products/values?field=brand
 * Returns distinct values for a given field across all products in the shop.
 * Used by AutoSuggest in the product form.
 *
 * Supported fields: brand, model, series, color, storage, ram, subcategory, category
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const field = url.searchParams.get("field");
  const parent = url.searchParams.get("parent") || undefined;

  if (!field) {
    return { values: [] };
  }

  const values = await productsService.distinctFieldValues(ctx, field, parent);
  return { values };
});
