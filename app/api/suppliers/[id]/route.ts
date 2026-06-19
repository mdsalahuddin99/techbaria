export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { suppliersService } from "@/server/services/suppliersService";
import { supplierUpdateSchema } from "@/shared/validators/supplier";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return suppliersService.getById(ctx, params.id);
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, supplierUpdateSchema);
  return suppliersService.update(ctx, params.id, body);
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await suppliersService.remove(ctx, params.id);
  return { success: true };
});
