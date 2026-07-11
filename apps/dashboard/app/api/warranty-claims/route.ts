export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { warrantyClaimsService } from "@/server/services/warrantyClaimsService";
import { warrantyClaimCreateSchema } from "@/shared/validators/warrantyClaim";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/warranty-claims
 */
export const GET = apiHandler(async (ctx: Ctx) => {
  return warrantyClaimsService.list(ctx);
});

/**
 * POST /api/warranty-claims
 */
export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, warrantyClaimCreateSchema);
  return warrantyClaimsService.create(ctx, body);
}, "warrantyClaims:create");
