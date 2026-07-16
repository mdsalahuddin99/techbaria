import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { serialise } from "./serialiser";
import { resolveCategoryId, resolveBrandId, resolveModelId, resolveSeriesId, resolveProductTypeId } from "./resolvers";
import type { ProductUpdateInput } from "./types";

/** Update an existing product. Requires MANAGER+. */
export async function update(ctx: Ctx, id: string, input: ProductUpdateInput) {
  requireRole(ctx, "CASHIER");

  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: { name: true, categoryId: true, globalBrandId: true, globalModelId: true },
  });
  if (!existingProduct) {
    throw new ServiceError("NOT_FOUND", "Product not found", 404);
  }

  // Build update data — skip undefined fields
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    data.name = input.name;
    // Attempt to resolve global ProductType from name
    data.productTypeId = await resolveProductTypeId(ctx, input.name) ?? null;
  }
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
  if (input.isFlashDeal !== undefined) data.isFlashDeal = input.isFlashDeal;
  if (input.barcode !== undefined) data.barcode = input.barcode;
  if (input.onlinePrice !== undefined) data.onlinePrice = input.onlinePrice;
  if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice;

  const resolvedCategoryId = input.categoryId !== undefined
    ? (await resolveCategoryId(ctx, input.categoryId))
    : existingProduct.categoryId;

  if (input.categoryId !== undefined) {
    data.categoryId = resolvedCategoryId ?? null;
  }

  if (input.brand !== undefined) {
    data.globalBrandId = input.brand ? (await resolveBrandId(ctx, input.brand)) ?? null : null;
  }

  if (input.model !== undefined) {
    data.globalModelId = input.model ? (await resolveModelId(ctx, input.model)) ?? null : null;
  }

  if (input.series !== undefined) {
    data.globalSeriesId = input.series ? (await resolveSeriesId(ctx, input.series)) ?? null : null;
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
  if (input.bundleQty !== undefined) data.bundleQty = input.bundleQty;
  if (input.warrantyStartDate !== undefined) {
    data.warrantyStartDate = input.warrantyStartDate ? new Date(input.warrantyStartDate) : null;
  }
  if (input.warrantyMonths !== undefined) data.warrantyMonths = input.warrantyMonths;

  // Handle imageUrl and galleryImages update via ProductImage relation
  if (input.imageUrl !== undefined || input.galleryImages !== undefined) {
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

  // If global stock was manually updated, try to sync it to the warehouse stock 
  // if there is only a single warehouse entry, to prevent POS vs Inventory mismatch.
  if (input.stock !== undefined) {
    const wStocks = await prisma.warehouseStock.findMany({ where: { productId: id } });
    if (wStocks.length === 1) {
      await prisma.warehouseStock.update({
        where: { id: wStocks[0].id },
        data: { qty: input.stock }
      });
    }
  }

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
        globalBrand: true,
        globalModel: true,
        globalSeries: true,
        productType: true,
      },
    })
  );
}
