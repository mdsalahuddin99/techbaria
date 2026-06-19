export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const pagination = parsePaginationParams(url);
  return salesService.listStorefrontOrders(ctx, pagination);
});
