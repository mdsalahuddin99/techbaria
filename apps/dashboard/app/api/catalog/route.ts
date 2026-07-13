export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import {
  listBrands, createBrand, updateBrand, deleteBrand,
  listProductNames, createProductName, updateProductName, deleteProductName,
  listModels, createModel, updateModel, deleteModel,
  listSeries, createSeries, updateSeries, deleteSeries,
  listColors, createColor, updateColor, deleteColor,
  listStorage, createStorage, updateStorage, deleteStorage,
  listRam, createRam, updateRam, deleteRam,
} from "@/server/services/catalogService";
import { z } from "zod";
import type { Ctx } from "@/server/lib/ctx";

const entitySchema = z.object({ name: z.string().min(1) });

type Entity = "brands" | "products" | "models" | "series" | "colors" | "storage" | "ram";

/**
 * GET /api/catalog?entity=brands — list all global entities
 * POST /api/catalog — create { entity, name }
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity") as Entity | null;
  const subcategory = url.searchParams.get("subcategory") || undefined;
  const brandId = url.searchParams.get("brandId") || undefined;
  const productTypeId = url.searchParams.get("productTypeId") || undefined;
  const modelId = url.searchParams.get("modelId") || undefined;
  const search = url.searchParams.get("search") || undefined;

  if (!entity) return [];

  switch (entity) {
    case "brands":   return listBrands(ctx, subcategory, search);
    case "products": return listProductNames(ctx, brandId, search);
    case "models":   return listModels(ctx, productTypeId, search);
    case "series":   return listSeries(ctx, modelId, search);
    case "colors":   return listColors(ctx);
    case "storage":  return listStorage(ctx);
    case "ram":      return listRam(ctx);
    default:         return [];
  }
}, "catalog:list");

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await req.json() as {
    entity: Entity;
    name: string;
    subcategories?: string[];
    brands?: string[];
    productTypes?: string[];
    models?: string[];
  };
  const { entity, name, subcategories, brands, productTypes, models } = body;

  switch (entity) {
    case "brands": {
      const { name: n } = entitySchema.parse(body);
      return createBrand(ctx, n, subcategories);
    }
    case "products": {
      const { name: n } = entitySchema.parse(body);
      return createProductName(ctx, n, brands);
    }
    case "models": {
      const { name: n } = entitySchema.parse(body);
      return createModel(ctx, n, productTypes);
    }
    case "series": {
      const { name: n } = entitySchema.parse(body);
      return createSeries(ctx, n, models);
    }
    case "colors": {
      const { name: n } = entitySchema.parse(body);
      return createColor(ctx, n);
    }
    case "storage": {
      const { name: n } = entitySchema.parse(body);
      return createStorage(ctx, n);
    }
    case "ram": {
      const { name: n } = entitySchema.parse(body);
      return createRam(ctx, n);
    }
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}, "catalog:create");

export const PUT = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await req.json() as {
    entity: Entity;
    id: string;
    name: string;
    isPublished?: boolean;
    subcategories?: string[];
    brands?: string[];
    productTypes?: string[];
    models?: string[];
  };
  const { entity, id, name, isPublished, subcategories, brands, productTypes, models } = body;

  switch (entity) {
    case "brands":   return updateBrand(ctx, id, name, isPublished, subcategories);
    case "products": return updateProductName(ctx, id, name, isPublished, brands);
    case "models":   return updateModel(ctx, id, name, isPublished, productTypes);
    case "series":   return updateSeries(ctx, id, name, isPublished, models);
    case "colors":   return updateColor(ctx, id, name, isPublished);
    case "storage":  return updateStorage(ctx, id, name, isPublished);
    case "ram":      return updateRam(ctx, id, name, isPublished);
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
    case "colors": await deleteColor(ctx, id); break;
    case "storage": await deleteStorage(ctx, id); break;
    case "ram": await deleteRam(ctx, id); break;
    default: throw new Error(`Unknown entity: ${entity}`);
  }
  return { success: true };
}, "catalog:delete");
