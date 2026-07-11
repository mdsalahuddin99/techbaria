export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { inventoryService } from "@/server/services/inventoryService";
import { adjustmentSchema } from "@/shared/validators/inventory";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, adjustmentSchema);
  return inventoryService.adjust(ctx, body);
});
