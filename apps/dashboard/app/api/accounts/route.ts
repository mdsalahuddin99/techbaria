export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { accountsService } from "@/server/services/accountsService";
import { accountCreateSchema } from "@/shared/validators/account";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const pagination = parsePaginationParams(new URL(req.url));
  return accountsService.list(ctx, pagination);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, accountCreateSchema);
  return accountsService.create(ctx, body);
});
