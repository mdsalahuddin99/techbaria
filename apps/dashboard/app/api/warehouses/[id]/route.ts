export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { warehousesService } from "@/server/services/warehousesService";
import { warehouseSchema } from "@/shared/validators/warehouse";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  return warehousesService.getById(ctx, params.id);
});

export const PUT = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, warehouseSchema);
  return warehousesService.update(ctx, params.id, body);
});

export const DELETE = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  await warehousesService.remove(ctx, params.id);
  return { success: true };
});
