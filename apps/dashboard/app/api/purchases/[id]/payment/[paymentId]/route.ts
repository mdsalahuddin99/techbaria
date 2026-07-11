export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";

export const DELETE = apiHandler(async (
  ctx: Ctx,
  req: Request,
  { params }: { params: { id: string, paymentId: string } },
) => {
  await purchasesService.deletePayment(ctx, params.id, params.paymentId);
  return { success: true };
});
