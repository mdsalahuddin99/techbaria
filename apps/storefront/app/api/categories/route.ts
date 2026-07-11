export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { categoriesService } from "@/server/services/categoriesService";
import { categoryCreateSchema } from "@/shared/validators/category";
import type { Ctx } from "@/server/lib/ctx";
import type { CategoryCreateInput } from "@/server/services/categoriesService";

/**
 * GET /api/categories — list all categories as a tree.
 * ?flat=true → flat list for dropdowns
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("flat") === "true") {
    return categoriesService.listFlat(ctx);
  }
  return categoriesService.list(ctx);
});

/**
 * POST /api/categories — create a new category. Requires MANAGER+.
 */
export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, categoryCreateSchema);
  return categoriesService.create(ctx, body);
}, "categories:create", ["ADMIN"]);
