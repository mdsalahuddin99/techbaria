export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { categoriesService } from "@/server/services/categoriesService";
import { categoryUpdateSchema } from "@/shared/validators/category";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/categories/:id — get a single category.
 */
export const GET = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  return categoriesService.getById(ctx, params.id);
});

/**
 * PATCH /api/categories/:id — update a category. Requires MANAGER+.
 */
export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, categoryUpdateSchema);
  return categoriesService.update(ctx, params.id, body);
}, "categories:update", ["ADMIN"]);

/**
 * DELETE /api/categories/:id — delete a category. Requires MANAGER+.
 */
export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await categoriesService.remove(ctx, params.id);
  return { success: true };
}, "categories:delete", ["ADMIN"]);
