export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { accountsService } from "@/server/services/accountsService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return accountsService.listLedger(ctx);
});
