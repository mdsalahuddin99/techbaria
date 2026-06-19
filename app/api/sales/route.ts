export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";
import { saleCreateSchema } from "@/shared/validators/sale";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const pagination = parsePaginationParams(url);
  const channel = url.searchParams.get("channel") as "POS" | "STOREFRONT" | undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  return salesService.list(ctx, pagination, {
    channel,
    customerId,
    ...(from && { from: new Date(from) }),
    ...(to && { to: new Date(to) }),
  });
}, "sales:list");

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, saleCreateSchema);
  return salesService.create(ctx, body);
}, "sales:create");
