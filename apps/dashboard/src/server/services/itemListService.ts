import "server-only";
import { prisma } from "@tech-baria/database";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
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

type ItemListInput = z.infer<typeof itemListSchema>;

export async function createItemList(ctx: Ctx, data: ItemListInput) {
  requireRole(ctx, "ADMIN");

  const {
    categoryId,
    subcategory,
    brandName,
    productTypeName,
    modelName,
    seriesName,
    colors = [],
    storages = [],
    rams = [],
  } = data;

  let brandId: string | undefined;
  let productTypeId: string | undefined;
  let modelId: string | undefined;
  let seriesId: string | undefined;

  // 1. Process Brand
  if (brandName?.trim()) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName.trim() },
      update: {},
      create: { name: brandName.trim() },
    });
    brandId = brand.id;

    if (subcategory) {
      await prisma.brandSubcategory.upsert({
        where: { brandId_subcategory: { brandId, subcategory } },
        update: {},
        create: { brandId, subcategory },
      });
    }
  }

  // 2. Process ProductType
  if (productTypeName?.trim()) {
    const pt = await prisma.productType.upsert({
      where: { name: productTypeName.trim() },
      update: {},
      create: { name: productTypeName.trim() },
    });
    productTypeId = pt.id;

    if (brandId) {
      await prisma.productTypeBrand.upsert({
        where: { productTypeId_brandId: { productTypeId, brandId } },
        update: {},
        create: { productTypeId, brandId },
      });
    }
  }

  // 3. Process Model
  if (modelName?.trim()) {
    const model = await prisma.model.upsert({
      where: { name: modelName.trim() },
      update: {},
      create: { name: modelName.trim() },
    });
    modelId = model.id;

    if (productTypeId) {
      await prisma.modelProductType.upsert({
        where: { modelId_productTypeId: { modelId, productTypeId } },
        update: {},
        create: { modelId, productTypeId },
      });
    }
  }

  // 4. Process Series
  if (seriesName?.trim()) {
    const series = await prisma.series.upsert({
      where: { name: seriesName.trim() },
      update: {},
      create: { name: seriesName.trim() },
    });
    seriesId = series.id;

    if (modelId) {
      await prisma.seriesModel.upsert({
        where: { seriesId_modelId: { seriesId, modelId } },
        update: {},
        create: { seriesId, modelId },
      });
    }
  }

  // 5. Process Colors, Storages, Rams (just ensure they exist in global table, though not strictly required since ItemList stores strings, but good for global catalog)
  for (const c of colors) {
    if (!c.trim()) continue;
    await prisma.color.upsert({
      where: { name: c.trim() },
      update: {},
      create: { name: c.trim() },
    });
  }
  for (const s of storages) {
    if (!s.trim()) continue;
    await prisma.storage.upsert({
      where: { name: s.trim() },
      update: {},
      create: { name: s.trim() },
    });
  }
  for (const r of rams) {
    if (!r.trim()) continue;
    await prisma.ram.upsert({
      where: { name: r.trim() },
      update: {},
      create: { name: r.trim() },
    });
  }

  // 6. Create the ItemList record
  const item = await prisma.itemList.create({
    data: {
      categoryId,
      subcategory,
      brandId,
      productTypeId,
      modelId,
      seriesId,
      colors: colors.filter(Boolean),
      storages: storages.filter(Boolean),
      rams: rams.filter(Boolean),
    },
    include: {
      brand: true,
      productType: true,
      model: true,
      series: true,
    }
  });

  return item;
}

export async function updateItemList(ctx: Ctx, id: string, data: ItemListInput) {
  requireRole(ctx, "ADMIN");

  const existing = await prisma.itemList.findUnique({ where: { id } });
  if (!existing) throw new ServiceError("NOT_FOUND", "Item list not found", 404);

  // We re-run the same linkage logic which acts as upsert, then update the item list
  const {
    categoryId,
    subcategory,
    brandName,
    productTypeName,
    modelName,
    seriesName,
    colors = [],
    storages = [],
    rams = [],
  } = data;

  let brandId: string | undefined;
  let productTypeId: string | undefined;
  let modelId: string | undefined;
  let seriesId: string | undefined;

  // Process Brand
  if (brandName?.trim()) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName.trim() },
      update: {},
      create: { name: brandName.trim() },
    });
    brandId = brand.id;

    if (subcategory) {
      await prisma.brandSubcategory.upsert({
        where: { brandId_subcategory: { brandId, subcategory } },
        update: {},
        create: { brandId, subcategory },
      });
    }
  }

  // Process ProductType
  if (productTypeName?.trim()) {
    const pt = await prisma.productType.upsert({
      where: { name: productTypeName.trim() },
      update: {},
      create: { name: productTypeName.trim() },
    });
    productTypeId = pt.id;

    if (brandId) {
      await prisma.productTypeBrand.upsert({
        where: { productTypeId_brandId: { productTypeId, brandId } },
        update: {},
        create: { productTypeId, brandId },
      });
    }
  }

  // Process Model
  if (modelName?.trim()) {
    const model = await prisma.model.upsert({
      where: { name: modelName.trim() },
      update: {},
      create: { name: modelName.trim() },
    });
    modelId = model.id;

    if (productTypeId) {
      await prisma.modelProductType.upsert({
        where: { modelId_productTypeId: { modelId, productTypeId } },
        update: {},
        create: { modelId, productTypeId },
      });
    }
  }

  // Process Series
  if (seriesName?.trim()) {
    const series = await prisma.series.upsert({
      where: { name: seriesName.trim() },
      update: {},
      create: { name: seriesName.trim() },
    });
    seriesId = series.id;

    if (modelId) {
      await prisma.seriesModel.upsert({
        where: { seriesId_modelId: { seriesId, modelId } },
        update: {},
        create: { seriesId, modelId },
      });
    }
  }

  // Process Colors, Storages, Rams
  for (const c of colors) {
    if (!c.trim()) continue;
    await prisma.color.upsert({ where: { name: c.trim() }, update: {}, create: { name: c.trim() } });
  }
  for (const s of storages) {
    if (!s.trim()) continue;
    await prisma.storage.upsert({ where: { name: s.trim() }, update: {}, create: { name: s.trim() } });
  }
  for (const r of rams) {
    if (!r.trim()) continue;
    await prisma.ram.upsert({ where: { name: r.trim() }, update: {}, create: { name: r.trim() } });
  }

  const updated = await prisma.itemList.update({
    where: { id },
    data: {
      categoryId: categoryId || null,
      subcategory: subcategory || null,
      brandId: brandId || null,
      productTypeId: productTypeId || null,
      modelId: modelId || null,
      seriesId: seriesId || null,
      colors: colors.filter(Boolean),
      storages: storages.filter(Boolean),
      rams: rams.filter(Boolean),
    },
    include: {
      brand: true,
      productType: true,
      model: true,
      series: true,
    }
  });

  return updated;
}

export async function deleteItemList(ctx: Ctx, id: string) {
  requireRole(ctx, "ADMIN");
  await prisma.itemList.delete({ where: { id } });
  return { success: true };
}

export async function listItemLists(ctx: Ctx) {
  const items = await prisma.itemList.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      brand: true,
      productType: true,
      model: true,
      series: true,
    }
  });
  return items;
}
