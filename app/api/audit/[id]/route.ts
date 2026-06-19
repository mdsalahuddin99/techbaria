export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { auditService } from "@/server/services/auditService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return auditService.getById(ctx, params.id);
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await auditService.remove(ctx, params.id);
  return { success: true };
});
