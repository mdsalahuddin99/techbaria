export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return salesService.getById(ctx, params.id);
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json();
  return salesService.update(ctx, params.id, body);
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await salesService.remove(ctx, params.id);
  return { success: true };
});
