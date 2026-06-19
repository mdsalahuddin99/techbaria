export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) {
    return { error: "customerId is required" };
  }
  return salesService.byCustomer(ctx, customerId);
});
