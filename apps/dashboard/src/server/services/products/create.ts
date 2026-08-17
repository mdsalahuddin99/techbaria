import "server-only";
import { prisma } from "@/server/db/client";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { serialise } from "./serialiser";
import { resolveCategoryId, resolveBrandId, resolveModelId, resolveSeriesId, resolveProductTypeId } from "./resolvers";
import type { ProductCreateInput } from "./types";
import { Prisma } from "@prisma/client";
import { ServiceError } from "@/server/lib/errors";

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  // If name has no English characters (e.g. pure Bengali), fallback to a timestamp string
  return slug || `p-${Date.now().toString(36)}`;
}

/** Create a new product. Requires MANAGER+. */
export async function create(ctx: Ctx, input: ProductCreateInput) {
  requireRole(ctx, "CASHIER");
  let slugBaseName = input.name;
  
  if (!input.slug) {
    if (input.model) {
      if (input.model.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.model)) {
        const m = await prisma.model.findUnique({ where: { id: input.model }, select: { name: true } });
        if (m) slugBaseName += ` ${m.name}`;
      } else {
        slugBaseName += ` ${input.model}`;
      }
    } else if (input.brand) {
      if (input.brand.length === 25 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.brand)) {
        const b = await prisma.brand.findUnique({ where: { id: input.brand }, select: { name: true } });
        if (b) slugBaseName += ` ${b.name}`;
      } else {
        slugBaseName += ` ${input.brand}`;
      }
    }
  }

  let slug = input.slug || slugify(slugBaseName);

  let isUnique = false;
  let attempt = 0;
  while (!isUnique && attempt < 5) {
    const existing = await prisma.product.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      isUnique = true;
    } else {
      slug = `${slugify(slugBaseName)}-${Math.random().toString(36).slice(2, 6)}`;
      attempt++;
    }
  }
  const resolvedCategoryId = await resolveCategoryId(ctx, input.categoryId);
  const resolvedBrandId = await resolveBrandId(ctx, input.brand);
  const resolvedModelId = await resolveModelId(ctx, input.model);
  const resolvedSeriesId = await resolveSeriesId(ctx, input.series);
  
  // input.name is the actual product name string. 
  // We can try to resolve it to a product type (for global catalog).
  const resolvedProductTypeId = await resolveProductTypeId(ctx, input.name);

  try {
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
        isFlashDeal: input.isFlashDeal ?? false,
        isService: input.isService ?? false,
        onlinePrice: input.onlinePrice,
        compareAtPrice: input.compareAtPrice,
        // Extended fields
        globalBrandId: resolvedBrandId,
        productTypeId: resolvedProductTypeId,
        globalModelId: resolvedModelId,
        globalSeriesId: resolvedSeriesId,
        subcategory: input.subcategory, // we still save the text here for backward compat
        color: input.color,
        storage: input.storage,
        ram: input.ram,
        condition: input.condition,
        emoji: input.emoji ?? "📦",
        wholesalePrice: input.wholesalePrice ?? 0,
        trackSerials: input.trackSerials ?? true,
        supplierId: input.supplierId ?? null,
        bundleQty: input.bundleQty,
        searchTags: input.searchTags ?? [],
        warrantyStartDate: input.warrantyStartDate ? new Date(input.warrantyStartDate) : undefined,
        ...(input.warrantyMonths !== undefined && { warrantyMonths: input.warrantyMonths }),
        images: {
          create: [
            ...(input.imageUrl ? [{ url: input.imageUrl, publicId: input.imageUrl.split("/").pop() ?? "img", position: 0 }] : []),
            ...(input.galleryImages ? input.galleryImages.map((url, i) => ({ url, publicId: url.split("/").pop() ?? "img", position: i + 1 })) : []),
          ],
        },
      },
      include: {
        category: true,
        images: { orderBy: { position: "asc" as const } },
        globalBrand: true,
        globalModel: true,
        globalSeries: true,
        productType: true,
      },
    });
    await auditLogService.log(ctx, {
      entity: "Product",
      entityId: product.id,
      action: "CREATE",
      diff: { name: input.name, sku: input.sku, price: input.price },
    });
    // Invalidate product caches so storefront picks up the new product
    await cache.invalidateProducts();
    return serialise(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes("slug")) {
        throw new ServiceError("CONFLICT", "এই প্রোডাক্টের নাম বা Slug ইতিমধ্যে ব্যবহৃত হয়েছে। দয়া করে ভিন্ন নাম দিন।");
      }
      if (target.includes("sku")) {
        throw new ServiceError("CONFLICT", "এই SKU ইতিমধ্যে ব্যবহৃত হয়েছে।");
      }
      if (target.includes("barcode")) {
        throw new ServiceError("CONFLICT", "এই Barcode ইতিমধ্যে ব্যবহৃত হয়েছে।");
      }
      throw new ServiceError("CONFLICT", "এই তথ্যটি (যেমন SKU, Barcode বা Slug) ইতিমধ্যে ব্যবহৃত হয়েছে।");
    }
    throw error;
  }
}
