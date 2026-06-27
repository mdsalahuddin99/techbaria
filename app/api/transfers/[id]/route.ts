export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { transfersService } from "@/server/services/transfersService";
import { z } from "zod";
import type { Ctx } from "@/server/lib/ctx";

const updateTransferSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return transfersService.getById(ctx, params.id);
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const parsed = updateTransferSchema.parse(body);
  await transfersService.update(ctx, params.id, parsed);
  return { success: true };
}, "transfers:update", ["ADMIN"]);

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await transfersService.remove(ctx, params.id);
  return { success: true };
}, "transfers:delete", ["ADMIN"]);
