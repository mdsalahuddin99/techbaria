export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";
import { z } from "zod";

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, z.object({
    productId: z.string(),
    qty: z.number().min(0)
  }));
  await purchasesService.updateRestockItem(ctx, params.id, body.productId, body.qty);
  return { success: true };
});
