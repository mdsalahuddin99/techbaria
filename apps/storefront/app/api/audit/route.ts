export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { auditService } from "@/server/services/auditService";
import { auditCreateSchema } from "@/shared/validators/audit";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/audit — list all stock audits for the shop.
 */
export const GET = apiHandler(async (ctx: Ctx) => {
  return auditService.list(ctx);
});

/**
 * POST /api/audit — create a new stock audit draft.
 */
export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, auditCreateSchema);
  return auditService.create(ctx, body);
});
