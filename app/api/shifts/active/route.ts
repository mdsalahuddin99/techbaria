export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { shiftsService } from "@/server/services/shiftsService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return shiftsService.active(ctx);
});
