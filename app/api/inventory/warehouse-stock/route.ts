export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { inventoryService } from "@/server/services/inventoryService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId");
  if (!warehouseId) {
    return inventoryService.snapshot(ctx);
  }
  return inventoryService.warehouseStock(ctx, warehouseId);
});
