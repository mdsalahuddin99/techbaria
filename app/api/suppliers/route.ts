export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { suppliersService } from "@/server/services/suppliersService";
import { supplierCreateSchema } from "@/shared/validators/supplier";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const pagination = parsePaginationParams(new URL(req.url));
  return suppliersService.list(ctx, pagination);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, supplierCreateSchema);
  return suppliersService.create(ctx, body);
});
