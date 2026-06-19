export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";
import { refundCreateSchema } from "@/shared/validators/sale";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, refundCreateSchema);
  return salesService.refund(ctx, params.id, body);
});
