export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { expensesService } from "@/server/services/expensesService";
import { expenseUpdateSchema } from "@/shared/validators/expense";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return expensesService.getById(ctx, params.id);
});

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, expenseUpdateSchema);
  return expensesService.update(ctx, params.id, body);
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await expensesService.remove(ctx, params.id);
  return { success: true };
});
