export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";

export const DELETE = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  await purchasesService.removeRestock(ctx, params.id);
  return { success: true };
});
