import "server-only";
import type { Ctx } from "@/server/lib/ctx";
import type { PaginationParams } from "@/server/lib/paginate";
import { storefrontOrder } from "./storefrontOrder";
import type { StorefrontOrderCreateInput, StorefrontOrderStatus } from "./types";

export async function createStorefrontOrder(ctx: Ctx, input: StorefrontOrderCreateInput) {
  return storefrontOrder.createStorefrontOrder(ctx, input);
}

export async function listStorefrontOrders(ctx: Ctx, params?: PaginationParams) {
  return storefrontOrder.listStorefrontOrders(ctx, params);
}

export async function updateStorefrontOrderStatus(ctx: Ctx, id: string, status: StorefrontOrderStatus) {
  return storefrontOrder.updateStorefrontOrderStatus(ctx, id, status);
}

export async function getStorefrontOrder(ctx: Ctx, id: string) {
  return storefrontOrder.getStorefrontOrder(ctx, id);
}
