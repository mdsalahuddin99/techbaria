export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";
import { voidSaleSchema } from "@/shared/validators/sale";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const { reason } = await parseBody(req, voidSaleSchema);
  return salesService.void(ctx, params.id, reason);
});
