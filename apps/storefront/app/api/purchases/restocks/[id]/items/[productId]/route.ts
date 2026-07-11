export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";

export const DELETE = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string, productId: string } }) => {
  await purchasesService.removeRestockItem(ctx, params.id, params.productId);
  return { success: true };
});
