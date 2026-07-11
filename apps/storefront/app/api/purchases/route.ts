export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import { purchaseCreateSchema } from "@/shared/validators/purchase";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const pagination = parsePaginationParams(url);
  const filter = {
    search: url.searchParams.get("search") || undefined,
    status: url.searchParams.get("status") || undefined,
    sortKey: url.searchParams.get("sortKey") || undefined,
    sortDir: (url.searchParams.get("sortDir") as "asc" | "desc") || undefined,
  };
  return purchasesService.list(ctx, pagination, filter);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, purchaseCreateSchema);
  return purchasesService.create(ctx, body);
});
