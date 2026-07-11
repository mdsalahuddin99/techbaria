export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { expensesService } from "@/server/services/expensesService";
import { expenseCreateSchema } from "@/shared/validators/expense";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const pagination = parsePaginationParams(new URL(req.url));
  return expensesService.list(ctx, pagination);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, expenseCreateSchema);
  return expensesService.create(ctx, body);
});
