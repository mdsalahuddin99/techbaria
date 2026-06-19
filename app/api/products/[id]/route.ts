export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";
import { productUpdateSchema } from "@/shared/validators/product";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return productsService.getById(ctx, params.id);
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, productUpdateSchema);
  return productsService.update(ctx, params.id, body);
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await productsService.remove(ctx, params.id);
  return { success: true };
});
