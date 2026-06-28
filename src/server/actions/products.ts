"use server";

import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db/client";
import { buildCtx } from "@/server/lib/ctx";
import { ServiceError } from "@/server/lib/errors";
import { productsService, type ProductCreateInput, type ProductUpdateInput } from "@/server/services/productsService";
import { productCreateSchema, productUpdateSchema } from "@/shared/validators/product";

/**
 * Helper to build an authenticated context for Server Actions.
 * Throws ServiceError if not authenticated.
 */
async function getActionCtx() {
  const session = await auth();
  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "User not authenticated", 401);
  }
  return buildCtx(session.user as any);
}

// ─── Products API Actions ───────────────────────────────────────────────────

export async function listProductsAction(
  filter?: { search?: string; categoryId?: string; isPublished?: boolean; lowStock?: boolean },
  params?: { cursor?: string; limit?: number }
) {
  const ctx = await getActionCtx();
  return productsService.list(ctx, params, filter);
}

export async function getProductByIdAction(id: string) {
  const ctx = await getActionCtx();
  return productsService.getById(ctx, id);
}

export async function createProductAction(input: any) {
  const ctx = await getActionCtx();
  // Validates the raw client input and transforms it into the Prisma service shape
  const valid = productCreateSchema.parse(input) as unknown as ProductCreateInput;
  return productsService.create(ctx, valid);
}

export async function updateProductAction(id: string, patch: any) {
  const ctx = await getActionCtx();
  const valid = productUpdateSchema.parse(patch) as unknown as ProductUpdateInput;
  return productsService.update(ctx, id, valid);
}

export async function deleteProductAction(id: string) {
  const ctx = await getActionCtx();
  await productsService.remove(ctx, id);
  return { success: true };
}

export async function getProductDistinctValuesAction(field: string, parent?: string) {
  const ctx = await getActionCtx();
  return productsService.distinctFieldValues(ctx, field, parent);
}

export async function getAvailableSerialsAction(productId: string, limit: number) {
  const ctx = await getActionCtx();
  const serials = await prisma.serialNumber.findMany({
    where: {
      productId,
      status: "IN_STOCK",
      // optionally add warehouse filtering if needed, but for labels IN_STOCK is enough
    },
    select: { serial: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });
  return serials.map((s) => s.serial);
}
