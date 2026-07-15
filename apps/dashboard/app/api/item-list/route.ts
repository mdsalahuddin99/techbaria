import { apiHandler } from "@/server/lib/apiHandler";
import { createItemList, updateItemList, deleteItemList, listItemLists } from "@/server/services/itemListService";
import { z } from "zod";

const itemListSchema = z.object({
  categoryId: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  brandName: z.string().optional().nullable(),
  productTypeName: z.string().optional().nullable(),
  modelName: z.string().optional().nullable(),
  seriesName: z.string().optional().nullable(),
  colors: z.array(z.string()).optional(),
  storages: z.array(z.string()).optional(),
  rams: z.array(z.string()).optional(),
});

export const GET = apiHandler(async (ctx) => {
  return listItemLists(ctx);
}, "itemList:read");

export const POST = apiHandler(async (ctx, req) => {
  const body = await req.json();
  const data = itemListSchema.parse(body);
  return createItemList(ctx, data);
}, "itemList:create");

export const PUT = apiHandler(async (ctx, req) => {
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) throw new Error("ID is required for update");
  const data = itemListSchema.parse(rest);
  return updateItemList(ctx, id, data);
}, "itemList:update");

export const DELETE = apiHandler(async (ctx, req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) throw new Error("ID is required for delete");
  return deleteItemList(ctx, id);
}, "itemList:delete");
