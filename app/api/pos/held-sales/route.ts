import { apiHandler } from "@/server/lib/apiHandler";
import { heldSalesService } from "@/server/services/heldSalesService";
import type { Ctx } from "@/server/lib/ctx";
import { z } from "zod";

const createSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  cart: z.array(z.any()),
  discount: z.number().default(0),
});

export const GET = apiHandler(async (ctx: Ctx) => {
  return heldSalesService.list(ctx);
}, "heldSales:list");

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await req.json();
  const input = createSchema.parse(body);
  return heldSalesService.create(ctx, input as any);
}, "heldSales:create");

export const DELETE = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw new Error("Missing id");
  await heldSalesService.delete(ctx, id);
  return { success: true };
}, "heldSales:delete");
