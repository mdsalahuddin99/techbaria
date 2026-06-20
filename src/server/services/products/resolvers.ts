import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";

/**
 * Resolve a category name (from frontend) to a Prisma category ID.
 * If `raw` is already a UUID it is returned as-is.
 * If no matching category is found, returns `undefined`.
 */
export async function resolveCategoryId(
  ctx: Ctx,
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  // Already a UUID? (backend-generated IDs are 36-char hex with hyphens or cuid length 25)
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  // Otherwise treat as a category name — look up by name
  const cat = await prisma.category.findFirst({
    where: { name: raw },
    select: { id: true },
  });
  return cat?.id ?? undefined;
}

export async function resolveBrandId(
  ctx: Ctx,
  raw: string | null | undefined,
  categoryId: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const brand = await prisma.categoryBrand.findFirst({
    where: { name: raw, ...(categoryId && { categoryId }) },
    select: { id: true },
  });
  return brand?.id ?? undefined;
}

export async function resolveModelId(
  ctx: Ctx,
  raw: string | null | undefined,
  brandId: string | null | undefined,
  productName: string,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const subProduct = await prisma.subcategoryProduct.findFirst({
    where: { name: productName, ...(brandId && { brandId }) },
    select: { id: true },
  });
  if (!subProduct) return undefined;

  const model = await prisma.subcategoryModel.findFirst({
    where: { name: raw, productId: subProduct.id },
    select: { id: true },
  });
  return model?.id ?? undefined;
}

export async function resolveSeriesId(
  ctx: Ctx,
  raw: string | null | undefined,
  modelId: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const series = await prisma.subcategorySeries.findFirst({
    where: { name: raw, ...(modelId && { modelId }) },
    select: { id: true },
  });
  return series?.id ?? undefined;
}
