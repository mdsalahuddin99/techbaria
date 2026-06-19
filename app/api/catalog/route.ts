export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import {
  listBrands, createBrand, updateBrand, deleteBrand,
  listProductNames, createProductName, updateProductName, deleteProductName,
  listModels, createModel, updateModel, deleteModel,
  listSeries, createSeries, updateSeries, deleteSeries,
} from "@/server/services/catalogService";
import { z } from "zod";
import type { Ctx } from "@/server/lib/ctx";

const brandSchema = z.object({ name: z.string().min(1), categoryId: z.string().min(1) });
const productSchema = z.object({ name: z.string().min(1), brandId: z.string().min(1) });
const modelSchema = z.object({ name: z.string().min(1), productId: z.string().min(1) });
const seriesSchema = z.object({ name: z.string().min(1), modelId: z.string().min(1) });

type Entity = "brands" | "products" | "models" | "series";

/**
 * GET /api/catalog?entity=brands&parentId=xxx — list
 * POST /api/catalog — create { entity, name, parentId }
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity") as Entity | null;
  const parentId = url.searchParams.get("parentId") || "";

  if (!entity || !parentId) return [];

  switch (entity) {
    case "brands":   return listBrands(ctx, parentId);
    case "products": return listProductNames(ctx, parentId);
    case "models":   return listModels(ctx, parentId);
    case "series":   return listSeries(ctx, parentId);
    default:         return [];
  }
}, "catalog:list");

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await req.json() as { entity: Entity; name: string; parentId: string };
  const { entity, name, parentId } = body;

  switch (entity) {
    case "brands": {
      const { name: n, categoryId } = brandSchema.parse(body);
      return createBrand(ctx, n, categoryId);
    }
    case "products": {
      const { name: n, brandId } = productSchema.parse(body);
      return createProductName(ctx, n, brandId);
    }
    case "models": {
      const { name: n, productId } = modelSchema.parse(body);
      return createModel(ctx, n, productId);
    }
    case "series": {
      const { name: n, modelId } = seriesSchema.parse(body);
      return createSeries(ctx, n, modelId);
    }
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}, "catalog:create");

export const PUT = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await req.json() as { entity: Entity; id: string; name: string };
  const { entity, id, name } = body;

  switch (entity) {
    case "brands": return updateBrand(ctx, id, name);
    case "products": return updateProductName(ctx, id, name);
    case "models": return updateModel(ctx, id, name);
    case "series": return updateSeries(ctx, id, name);
    default: throw new Error(`Unknown entity: ${entity}`);
  }
}, "catalog:update");

export const DELETE = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity") as Entity | null;
  const id = url.searchParams.get("id") || "";

  if (!entity || !id) throw new Error("Missing entity or id");

  switch (entity) {
    case "brands": await deleteBrand(ctx, id); break;
    case "products": await deleteProductName(ctx, id); break;
    case "models": await deleteModel(ctx, id); break;
    case "series": await deleteSeries(ctx, id); break;
    default: throw new Error(`Unknown entity: ${entity}`);
  }
  return { success: true };
}, "catalog:delete");
