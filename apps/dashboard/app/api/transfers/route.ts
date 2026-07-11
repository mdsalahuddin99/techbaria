export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { transfersService } from "@/server/services/transfersService";
import { transferCreateSchema } from "@/shared/validators/transfer";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const pagination = parsePaginationParams(new URL(req.url));
  return transfersService.list(ctx, pagination);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, transferCreateSchema);
  return transfersService.create(ctx, body);
});
