export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";
import { z } from "zod";

export const POST = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, z.object({
    supplierId: z.string().nullable().optional()
  }));
  await purchasesService.confirmRestock(ctx, params.id, body.supplierId);
  return { success: true };
});
