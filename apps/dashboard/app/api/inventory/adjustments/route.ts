export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { inventoryService } from "@/server/services/inventoryService";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const pagination = parsePaginationParams(new URL(req.url));
  return inventoryService.listAdjustments(ctx, pagination);
});
