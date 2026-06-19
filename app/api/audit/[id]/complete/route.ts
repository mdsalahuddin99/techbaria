export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { auditService } from "@/server/services/auditService";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  const audit = await auditService.complete(ctx, params.id);
  return audit;
});
