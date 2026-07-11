export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { accountsService } from "@/server/services/accountsService";
import { accountTransferSchema } from "@/shared/validators/account";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, accountTransferSchema);
  await accountsService.transfer(ctx, body);
  return { success: true };
});
