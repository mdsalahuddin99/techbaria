export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { accountsService } from "@/server/services/accountsService";
import { accountUpdateSchema } from "@/shared/validators/account";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return accountsService.getById(ctx, params.id);
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, accountUpdateSchema);
  return accountsService.update(ctx, params.id, body);
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await accountsService.archive(ctx, params.id);
  return { success: true };
});
