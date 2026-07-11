export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { storefrontService } from "@/server/services/storefrontService";
import { heroSlideCreateSchema } from "@/shared/validators/storefront";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/storefront/hero-slides — list all hero slides
 */
export const GET = apiHandler(async (ctx: Ctx) => {
  return storefrontService.listHeroSlides(ctx);
});

/**
 * POST /api/storefront/hero-slides — create a new hero slide. Requires MANAGER+.
 */
export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, heroSlideCreateSchema);
  return storefrontService.createHeroSlide(ctx, body);
}, "storefront:heroSlides:create", ["ADMIN"]);
