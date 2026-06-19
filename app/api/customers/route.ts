export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { customersService } from "@/server/services/customersService";
import { customerCreateSchema } from "@/shared/validators/customer";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const pagination = parsePaginationParams(url);
  const search = url.searchParams.get("search") ?? undefined;
  return customersService.list(ctx, pagination, search);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, customerCreateSchema);
  return customersService.create(ctx, body);
});
