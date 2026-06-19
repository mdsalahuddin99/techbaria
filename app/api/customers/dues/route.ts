export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { customersService } from "@/server/services/customersService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return customersService.withDues(ctx);
});
