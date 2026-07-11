export const runtime = "nodejs";

import { z } from "zod";
import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { salesService, type StorefrontOrderStatus } from "@/server/services/salesService";
import type { Ctx } from "@/server/lib/ctx";

const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, routeOpts) => {
  const params = routeOpts?.params ?? {};
  const id = params.id as string;
  if (!id) return new Response("Missing order id", { status: 400 });

  const body = await parseBody(req, statusSchema);
  return salesService.updateStorefrontOrderStatus(ctx, id, body.status as StorefrontOrderStatus);
});
