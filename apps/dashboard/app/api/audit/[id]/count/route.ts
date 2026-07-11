export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { auditService } from "@/server/services/auditService";
import { auditSetCountSchema } from "@/shared/validators/audit";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, auditSetCountSchema);
  await auditService.setCount(ctx, params.id, body.productId, body.countedQty, body.note);
  return { success: true };
});
