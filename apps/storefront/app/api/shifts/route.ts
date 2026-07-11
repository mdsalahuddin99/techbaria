export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { shiftsService } from "@/server/services/shiftsService";
import { shiftOpenSchema } from "@/shared/validators/shift";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return shiftsService.list(ctx);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const { openingBalance } = await parseBody(req, shiftOpenSchema);
  return shiftsService.open(ctx, openingBalance);
});
