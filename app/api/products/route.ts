export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";
import { productCreateSchema } from "@/shared/validators/product";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const pagination = parsePaginationParams(url);
  const search = url.searchParams.get("search") ?? undefined;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const isPublished = url.searchParams.get("isPublished");
  const lowStock = url.searchParams.get("lowStock");

  return productsService.list(
    ctx,
    pagination,
    {
      search,
      categoryId,
      ...(isPublished !== null && { isPublished: isPublished === "true" }),
      ...(lowStock !== null && { lowStock: lowStock === "true" }),
    },
  );
}, "products:list");

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, productCreateSchema);
  return productsService.create(ctx, body);
}, "products:create", ["MANAGER", "OWNER"]);
