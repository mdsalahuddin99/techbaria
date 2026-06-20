import "server-only";
import { prisma } from "@/server/db/client";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { serialise } from "./serialiser";
import { resolveCategoryId, resolveBrandId, resolveModelId, resolveSeriesId } from "./resolvers";
import type { ProductCreateInput } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Create a new product. Requires MANAGER+. */
export async function create(ctx: Ctx, input: ProductCreateInput) {
  requireRole(ctx, "MANAGER");
  let slug = input.slug ?? slugify(input.name);
  // Ensure unique slug by appending counter if needed
  const existing = await prisma.product.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }
  const resolvedCategoryId = await resolveCategoryId(ctx, input.categoryId);
  const resolvedBrandId = await resolveBrandId(ctx, input.brand, resolvedCategoryId);
  const resolvedModelId = await resolveModelId(ctx, input.model, resolvedBrandId, input.name);
  const resolvedSeriesId = await resolveSeriesId(ctx, input.series, resolvedModelId);

  const product = await prisma.product.create({
    data: {
      sku: input.sku,
      barcode: input.barcode,
      name: input.name,
      slug,
      description: input.description,
      shortDescription: input.shortDescription,
      categoryId: resolvedCategoryId,
      price: input.price,
      cost: input.cost ?? 0,
      stock: input.stock ?? 0,
      reorderLevel: input.reorderLevel ?? 0,
      unit: input.unit ?? "pc",
      isPublished: input.isPublished ?? false,
      // Extended fields
      brandId: resolvedBrandId,
      modelId: resolvedModelId,
      seriesId: resolvedSeriesId,
      subcategory: input.subcategory,
      color: input.color,
      storage: input.storage,
      ram: input.ram,
      condition: input.condition,
      emoji: input.emoji ?? "📦",
      wholesalePrice: input.wholesalePrice ?? 0,
      supplierId: input.supplierId ?? null,
      trackSerials: input.trackSerials ?? true,
      warrantyStartDate: input.warrantyStartDate ? new Date(input.warrantyStartDate) : undefined,
      ...(input.warrantyMonths !== undefined && { warrantyMonths: input.warrantyMonths }),
      ...(input.imageUrl ? {
        images: {
          create: { url: input.imageUrl, publicId: input.imageUrl.split("/").pop() ?? "img", position: 0 },
        },
      } : {}),
    },
    include: {
      category: true,
      images: { orderBy: { position: "asc" as const } },
      brand: true,
      model: true,
      series: true,
    },
  });
  await auditLogService.log(ctx, {
    entity: "Product",
    entityId: product.id,
    action: "CREATE",
    diff: { name: input.name, sku: input.sku, price: input.price },
  });
  // Invalidate product caches so storefront picks up the new product
  await cache.invalidateProducts("default");
  return serialise(product);
}
