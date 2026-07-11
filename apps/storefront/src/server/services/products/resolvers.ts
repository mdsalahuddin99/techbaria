import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";

/**
 * Resolve a category name (from frontend) to a Prisma category ID.
 * If `raw` is already a UUID/cuid it is returned as-is.
 */
export async function resolveCategoryId(
  ctx: Ctx,
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const cat = await prisma.category.findFirst({
    where: { name: raw },
    select: { id: true },
  });
  return cat?.id ?? undefined;
}

export async function resolveBrandId(
  ctx: Ctx,
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const brand = await prisma.brand.findFirst({
    where: { name: raw },
    select: { id: true },
  });
  return brand?.id ?? undefined;
}

export async function resolveProductTypeId(
  ctx: Ctx,
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const productType = await prisma.productType.findFirst({
    where: { name: raw },
    select: { id: true },
  });
  return productType?.id ?? undefined;
}

export async function resolveModelId(
  ctx: Ctx,
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const model = await prisma.model.findFirst({
    where: { name: raw },
    select: { id: true },
  });
  return model?.id ?? undefined;
}

export async function resolveSeriesId(
  ctx: Ctx,
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw) return undefined;
  if (raw.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const series = await prisma.series.findFirst({
    where: { name: raw },
    select: { id: true },
  });
  return series?.id ?? undefined;
}
