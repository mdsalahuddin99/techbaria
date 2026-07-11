export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";
import { z } from "zod";

export const GET = apiHandler(async (ctx: Ctx) => {
  return purchasesService.listRestocks(ctx);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, z.object({ note: z.string().optional() }));
  return purchasesService.createRestockDraft(ctx, body.note);
});
