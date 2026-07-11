export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import { z } from "zod";
import type { Ctx } from "@/server/lib/ctx";

const paymentSchema = z.object({
  amount: z.number().min(0),
  method: z.string(),
  accountId: z.string().optional(),
  note: z.string().optional(),
});

export const POST = apiHandler(async (
  ctx: Ctx,
  req: Request,
  { params }: { params: { id: string } },
) => {
  const body = await parseBody(req, paymentSchema);
  await purchasesService.addPayment(ctx, params.id, body);
  return { success: true };
});
