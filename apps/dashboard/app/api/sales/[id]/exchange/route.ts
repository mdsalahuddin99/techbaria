import { z } from "zod";
import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";
import { salesService } from "@/server/services/salesService";

const exchangeSchema = z.object({
  returnItems: z.array(z.object({
    productId: z.string(),
    qty: z.number().min(1),
    restock: z.boolean(),
  })),
  newItems: z.array(z.object({
    productId: z.string(),
    name: z.string().optional(),
    qty: z.number().min(1),
    price: z.number().min(0),
    discount: z.number().optional(),
    warrantyMonths: z.number().optional(),
    serials: z.array(z.string()).optional(),
  })),
  tenders: z.array(z.object({
    type: z.string(),
    amount: z.number().min(0),
    accountId: z.string().optional(),
    ref: z.string().optional(),
  })).optional(),
  refundMethod: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

export const POST = apiHandler(async (ctx: Ctx, req: Request, routeOpts) => {
  const params = routeOpts?.params ?? {};
  const id = params.id as string;
  if (!id) return Response.json({ error: "Missing sale id" }, { status: 400 });

  const validated = await parseBody(req, exchangeSchema);

  const result = await salesService.exchange(ctx, {
    originalSaleId: id,
    ...validated,
  });

  return { success: true, data: result };
});
