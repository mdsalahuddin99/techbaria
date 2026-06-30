import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { serialise } from "./serialiser";
import { resolveCategoryId, resolveBrandId, resolveModelId, resolveSeriesId } from "./resolvers";
import type { ProductUpdateInput } from "./types";

/** Update an existing product. Requires MANAGER+. */
export async function update(ctx: Ctx, id: string, input: ProductUpdateInput) {
  requireRole(ctx, "ADMIN");

  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: { name: true, categoryId: true, brandId: true, modelId: true },
  });
  if (!existingProduct) {
    throw new ServiceError("NOT_FOUND", "Product not found", 404);
  }

  // Build update data — skip undefined fields, resolve category name→ID
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
  if (input.price !== undefined) data.price = input.price;
  if (input.cost !== undefined) data.cost = input.cost;
  if (input.stock !== undefined) data.stock = input.stock;
  if (input.reorderLevel !== undefined) data.reorderLevel = input.reorderLevel;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.isPublished !== undefined) data.isPublished = input.isPublished;
  if (input.isTrending !== undefined) data.isTrending = input.isTrending;
  if (input.barcode !== undefined) data.barcode = input.barcode;

  const resolvedCategoryId = input.categoryId !== undefined
    ? (await resolveCategoryId(ctx, input.categoryId))
    : existingProduct.categoryId;

  if (input.categoryId !== undefined) {
    data.categoryId = resolvedCategoryId ?? null;
  }

  let resolvedBrandId = existingProduct.brandId;
  if (input.brand !== undefined) {
    resolvedBrandId = input.brand ? (await resolveBrandId(ctx, input.brand, resolvedCategoryId)) ?? null : null;
    data.brandId = resolvedBrandId;
  }

  let resolvedModelId = existingProduct.modelId;
  if (input.model !== undefined) {
    const productName = input.name !== undefined ? input.name : existingProduct.name;
    resolvedModelId = input.model ? (await resolveModelId(ctx, input.model, resolvedBrandId, productName)) ?? null : null;
    data.modelId = resolvedModelId;
  }

  if (input.series !== undefined) {
    const resolvedSeriesId = input.series ? (await resolveSeriesId(ctx, input.series, resolvedModelId)) ?? null : null;
    data.seriesId = resolvedSeriesId;
  }

  if (input.subcategory !== undefined) data.subcategory = input.subcategory;
  if (input.color !== undefined) data.color = input.color;
  if (input.storage !== undefined) data.storage = input.storage;
  if (input.ram !== undefined) data.ram = input.ram;
  if (input.condition !== undefined) data.condition = input.condition;
  if (input.emoji !== undefined) data.emoji = input.emoji;
  if (input.wholesalePrice !== undefined) data.wholesalePrice = input.wholesalePrice;
  if (input.supplierId !== undefined) data.supplierId = input.supplierId;
  if (input.trackSerials !== undefined) data.trackSerials = input.trackSerials;
  if (input.warrantyStartDate !== undefined) {
    data.warrantyStartDate = input.warrantyStartDate ? new Date(input.warrantyStartDate) : null;
  }
  if (input.warrantyMonths !== undefined) data.warrantyMonths = input.warrantyMonths;

  // Handle imageUrl and galleryImages update via ProductImage relation
  if (input.imageUrl !== undefined || input.galleryImages !== undefined) {
    // If we're updating images, we clear existing ones and recreate to ensure correct positioning.
    // Wait, let's only do this if we are actively updating images to avoid wiping them if not provided.
    // In our payload, we always provide both when saving from the form, so this is safe for full updates.
    await prisma.productImage.deleteMany({ where: { productId: id } });
    
    const imagesData = [];
    if (input.imageUrl) {
      imagesData.push({ productId: id, url: input.imageUrl, publicId: input.imageUrl.split("/").pop() ?? "img", position: 0 });
    }
    if (input.galleryImages && input.galleryImages.length > 0) {
      input.galleryImages.forEach((url, i) => {
        imagesData.push({ productId: id, url, publicId: url.split("/").pop() ?? "img", position: i + 1 });
      });
    }
    if (imagesData.length > 0) {
      await prisma.productImage.createMany({ data: imagesData });
    }
  }

  await prisma.product.update({
    where: { id },
    data,
  });

  await cache.invalidateSpecificProducts([id]);

  await auditLogService.log(ctx, {
    entity: "Product",
    entityId: id,
    action: "UPDATE",
    diff: Object.keys(data).length > 0 ? data : null,
  });

  return serialise(
    await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        brand: true,
        model: true,
        series: true,
      },
    })
  );
}
