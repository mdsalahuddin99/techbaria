export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { inventoryService } from "@/server/services/inventoryService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return inventoryService.snapshot(ctx);
});
