export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { warehousesService } from "@/server/services/warehousesService";
import { warehouseSchema } from "@/shared/validators/warehouse";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return warehousesService.list(ctx);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, warehouseSchema);
  return warehousesService.create(ctx, body);
});
