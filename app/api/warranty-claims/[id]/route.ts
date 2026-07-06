export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { warrantyClaimsService } from "@/server/services/warrantyClaimsService";
import { warrantyClaimUpdateSchema } from "@/shared/validators/warrantyClaim";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/warranty-claims/[id]
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  return warrantyClaimsService.getById(ctx, params.id);
});

/**
 * PATCH /api/warranty-claims/[id]
 */
export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, warrantyClaimUpdateSchema);
  return warrantyClaimsService.update(ctx, params.id, body);
}, "warrantyClaims:update");

/**
 * DELETE /api/warranty-claims/[id]
 */
export const DELETE = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  return warrantyClaimsService.delete(ctx, params.id);
}, "warrantyClaims:delete", ["ADMIN"]);
