export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { storefrontService } from "@/server/services/storefrontService";
import { heroSlideUpdateSchema } from "@/shared/validators/storefront";
import type { Ctx } from "@/server/lib/ctx";

/**
 * PUT /api/storefront/hero-slides/:id — update a hero slide
 */
export const PUT = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, heroSlideUpdateSchema);
  return storefrontService.updateHeroSlide(ctx, params.id, body);
}, "storefront:heroSlides:update", ["ADMIN"]);

/**
 * DELETE /api/storefront/hero-slides/:id — delete a hero slide
 */
export const DELETE = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  return storefrontService.deleteHeroSlide(ctx, params.id);
}, "storefront:heroSlides:delete", ["ADMIN"]);
