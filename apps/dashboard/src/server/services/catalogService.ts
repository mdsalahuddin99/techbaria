/**
 * Catalog hierarchy service — brands, product names, models, series.
 * Minimal CRUD for global dropdowns in Product form.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";

// ─── Brands ─────────────────────────────────────────────────────────────────

export interface BrandOutput {
  id: string;
  name: string;
  isPublished: boolean;
  subcategories: string[];
}

export async function listBrands(ctx: Ctx, subcategory?: string, search?: string): Promise<BrandOutput[]> {
  const whereClause: any = {};
  if (subcategory) {
    whereClause.subcategories = { some: { subcategory } };
  }
  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  // If no filters are provided, default to take 5 for preview performance.
  // Otherwise, take 20 to return enough search/filtered results.
  const hasFilter = subcategory || search;
  
  const items = await prisma.brand.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: { subcategories: true },
    take: hasFilter ? 20 : 5,
  });
  return items.map((b) => ({
    id: b.id,
    name: b.name,
    isPublished: b.isPublished,
    subcategories: b.subcategories.map((s) => s.subcategory),
  }));
}

export async function createBrand(ctx: Ctx, name: string, subcategories?: string[]): Promise<BrandOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Brand "${name}" already exists`, 409);
  const b = await prisma.brand.create({
    data: {
      name,
      subcategories: subcategories?.length
        ? { create: subcategories.map((s) => ({ subcategory: s })) }
        : undefined,
    },
    include: { subcategories: true },
  });
  return { id: b.id, name: b.name, isPublished: b.isPublished, subcategories: b.subcategories.map((s) => s.subcategory) };
}

export async function updateBrand(ctx: Ctx, id: string, name: string, isPublished?: boolean, subcategories?: string[]): Promise<BrandOutput> {
  requireRole(ctx, "ADMIN");
  const b = await prisma.brand.findFirst({ where: { id } });
  if (!b) throw new ServiceError("NOT_FOUND", "Brand not found", 404);
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Brand "${name}" already exists`, 409);
  // Update subcategory links if provided
  if (subcategories !== undefined) {
    await prisma.brandSubcategory.deleteMany({ where: { brandId: id } });
    if (subcategories.length > 0) {
      await prisma.brandSubcategory.createMany({
        data: subcategories.map((s) => ({ brandId: id, subcategory: s })),
        skipDuplicates: true,
      });
    }
  }
  const updated = await prisma.brand.update({
    where: { id },
    data: { name, ...(isPublished !== undefined && { isPublished }) },
    include: { subcategories: true },
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished, subcategories: updated.subcategories.map((s) => s.subcategory) };
}

export async function deleteBrand(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.brand.deleteMany({ where: { id } });
}

export async function bulkCreateBrands(ctx: Ctx, names: string[]): Promise<{ count: number }> {
  requireRole(ctx, "ADMIN");
  const validNames = names.map(n => n.trim()).filter(Boolean);
  if (validNames.length === 0) return { count: 0 };
  
  const result = await prisma.brand.createMany({
    data: validNames.map(name => ({ name })),
    skipDuplicates: true,
  });
  return { count: result.count };
}

// ─── Product Names (Product Types) ────────────────────────────────────────────

export interface ProductNameOutput {
  id: string;
  name: string;
  isPublished: boolean;
  brands: string[]; // Brand IDs or Names
}

export async function listProductNames(ctx: Ctx, brandId?: string, search?: string): Promise<ProductNameOutput[]> {
  const whereClause: any = {};
  if (brandId) {
    whereClause.brands = { some: { brandId } };
  }
  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  const hasFilter = brandId || search;

  const items = await prisma.productType.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: { brands: true },
    take: hasFilter ? 20 : 5,
  });
  return items.map((p) => ({
    id: p.id,
    name: p.name,
    isPublished: p.isPublished,
    brands: p.brands.map((b) => b.brandId),
  }));
}

export async function createProductName(ctx: Ctx, name: string, brands?: string[]): Promise<ProductNameOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.productType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Product name "${name}" already exists`, 409);
  const p = await prisma.productType.create({
    data: {
      name,
      brands: brands?.length
        ? { create: brands.map((b) => ({ brandId: b })) }
        : undefined,
    },
    include: { brands: true },
  });
  return { id: p.id, name: p.name, isPublished: p.isPublished, brands: p.brands.map((b) => b.brandId) };
}

export async function updateProductName(ctx: Ctx, id: string, name: string, isPublished?: boolean, brands?: string[]): Promise<ProductNameOutput> {
  requireRole(ctx, "ADMIN");
  const p = await prisma.productType.findFirst({ where: { id } });
  if (!p) throw new ServiceError("NOT_FOUND", "Product name not found", 404);
  const existing = await prisma.productType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Product name "${name}" already exists`, 409);
  if (brands !== undefined) {
    await prisma.productTypeBrand.deleteMany({ where: { productTypeId: id } });
    if (brands.length > 0) {
      await prisma.productTypeBrand.createMany({
        data: brands.map((b) => ({ productTypeId: id, brandId: b })),
        skipDuplicates: true,
      });
    }
  }
  const updated = await prisma.productType.update({
    where: { id },
    data: { name, ...(isPublished !== undefined && { isPublished }) },
    include: { brands: true },
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished, brands: updated.brands.map((b) => b.brandId) };
}

export async function deleteProductName(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.productType.deleteMany({ where: { id } });
}

export async function bulkCreateProductNames(ctx: Ctx, names: string[]): Promise<{ count: number }> {
  requireRole(ctx, "ADMIN");
  const validNames = names.map(n => n.trim()).filter(Boolean);
  if (validNames.length === 0) return { count: 0 };
  
  const result = await prisma.productType.createMany({
    data: validNames.map(name => ({ name })),
    skipDuplicates: true,
  });
  return { count: result.count };
}

// ─── Models ──────────────────────────────────────────────────────────────────

export interface ModelOutput {
  id: string;
  name: string;
  isPublished: boolean;
  productTypes: string[]; // ProductType IDs
}

export async function listModels(ctx: Ctx, productTypeId?: string, search?: string): Promise<ModelOutput[]> {
  const whereClause: any = {};
  if (productTypeId) {
    whereClause.productTypes = { some: { productTypeId } };
  }
  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  const hasFilter = productTypeId || search;

  const items = await prisma.model.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: { productTypes: true },
    take: hasFilter ? 20 : 5,
  });
  return items.map((m) => ({
    id: m.id,
    name: m.name,
    isPublished: m.isPublished,
    productTypes: m.productTypes.map((pt) => pt.productTypeId),
  }));
}

export async function createModel(ctx: Ctx, name: string, productTypes?: string[]): Promise<ModelOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.model.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Model "${name}" already exists`, 409);
  const m = await prisma.model.create({
    data: {
      name,
      productTypes: productTypes?.length
        ? { create: productTypes.map((pt) => ({ productTypeId: pt })) }
        : undefined,
    },
    include: { productTypes: true },
  });
  return { id: m.id, name: m.name, isPublished: m.isPublished, productTypes: m.productTypes.map((pt) => pt.productTypeId) };
}

export async function updateModel(ctx: Ctx, id: string, name: string, isPublished?: boolean, productTypes?: string[]): Promise<ModelOutput> {
  requireRole(ctx, "ADMIN");
  const m = await prisma.model.findFirst({ where: { id } });
  if (!m) throw new ServiceError("NOT_FOUND", "Model not found", 404);
  const existing = await prisma.model.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Model "${name}" already exists`, 409);
  if (productTypes !== undefined) {
    await prisma.modelProductType.deleteMany({ where: { modelId: id } });
    if (productTypes.length > 0) {
      await prisma.modelProductType.createMany({
        data: productTypes.map((pt) => ({ modelId: id, productTypeId: pt })),
        skipDuplicates: true,
      });
    }
  }
  const updated = await prisma.model.update({
    where: { id },
    data: { name, ...(isPublished !== undefined && { isPublished }) },
    include: { productTypes: true },
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished, productTypes: updated.productTypes.map((pt) => pt.productTypeId) };
}

export async function deleteModel(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.model.deleteMany({ where: { id } });
}

export async function bulkCreateModels(ctx: Ctx, names: string[]): Promise<{ count: number }> {
  requireRole(ctx, "ADMIN");
  const validNames = names.map(n => n.trim()).filter(Boolean);
  if (validNames.length === 0) return { count: 0 };
  
  const result = await prisma.model.createMany({
    data: validNames.map(name => ({ name })),
    skipDuplicates: true,
  });
  return { count: result.count };
}

// ─── Series ──────────────────────────────────────────────────────────────────

export interface SeriesOutput {
  id: string;
  name: string;
  isPublished: boolean;
  models: string[]; // Model IDs
}

export async function listSeries(ctx: Ctx, modelId?: string, search?: string): Promise<SeriesOutput[]> {
  const whereClause: any = {};
  if (modelId) {
    whereClause.models = { some: { modelId } };
  }
  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  const hasFilter = modelId || search;

  const items = await prisma.series.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: { models: true },
    take: hasFilter ? 20 : 5,
  });
  return items.map((s) => ({
    id: s.id,
    name: s.name,
    isPublished: s.isPublished,
    models: s.models.map((sm) => sm.modelId),
  }));
}

export async function createSeries(ctx: Ctx, name: string, models?: string[]): Promise<SeriesOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.series.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Series "${name}" already exists`, 409);
  const s = await prisma.series.create({
    data: {
      name,
      models: models?.length
        ? { create: models.map((m) => ({ modelId: m })) }
        : undefined,
    },
    include: { models: true },
  });
  return { id: s.id, name: s.name, isPublished: s.isPublished, models: s.models.map((sm) => sm.modelId) };
}

export async function updateSeries(ctx: Ctx, id: string, name: string, isPublished?: boolean, models?: string[]): Promise<SeriesOutput> {
  requireRole(ctx, "ADMIN");
  const s = await prisma.series.findFirst({ where: { id } });
  if (!s) throw new ServiceError("NOT_FOUND", "Series not found", 404);
  const existing = await prisma.series.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Series "${name}" already exists`, 409);
  if (models !== undefined) {
    await prisma.seriesModel.deleteMany({ where: { seriesId: id } });
    if (models.length > 0) {
      await prisma.seriesModel.createMany({
        data: models.map((m) => ({ seriesId: id, modelId: m })),
        skipDuplicates: true,
      });
    }
  }
  const updated = await prisma.series.update({
    where: { id },
    data: { name, ...(isPublished !== undefined && { isPublished }) },
    include: { models: true },
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished, models: updated.models.map((sm) => sm.modelId) };
}

export async function deleteSeries(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.series.deleteMany({ where: { id } });
}

export async function bulkCreateSeries(ctx: Ctx, names: string[]): Promise<{ count: number }> {
  requireRole(ctx, "ADMIN");
  const validNames = names.map(n => n.trim()).filter(Boolean);
  if (validNames.length === 0) return { count: 0 };
  
  const result = await prisma.series.createMany({
    data: validNames.map(name => ({ name })),
    skipDuplicates: true,
  });
  return { count: result.count };
}

// ─── Colors ──────────────────────────────────────────────────────────────────

export interface ColorOutput {
  id: string;
  name: string;
  isPublished: boolean;
}

export async function listColors(ctx: Ctx): Promise<ColorOutput[]> {
  const items = await prisma.color.findMany({ orderBy: { name: "asc" } });
  return items.map((c) => ({ id: c.id, name: c.name, isPublished: c.isPublished }));
}

export async function createColor(ctx: Ctx, name: string): Promise<ColorOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.color.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) throw new ServiceError("CONFLICT", `Color "${name}" already exists`, 409);
  const c = await prisma.color.create({ data: { name } });
  return { id: c.id, name: c.name, isPublished: c.isPublished };
}

export async function updateColor(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<ColorOutput> {
  requireRole(ctx, "ADMIN");
  const c = await prisma.color.findFirst({ where: { id } });
  if (!c) throw new ServiceError("NOT_FOUND", "Color not found", 404);
  const existing = await prisma.color.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Color "${name}" already exists`, 409);
  const updated = await prisma.color.update({ where: { id }, data: { name, ...(isPublished !== undefined && { isPublished }) } });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteColor(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.color.deleteMany({ where: { id } });
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export interface StorageOutput {
  id: string;
  name: string;
  isPublished: boolean;
}

export async function listStorage(ctx: Ctx): Promise<StorageOutput[]> {
  const items = await prisma.storage.findMany({ orderBy: { name: "asc" } });
  return items.map((s) => ({ id: s.id, name: s.name, isPublished: s.isPublished }));
}

export async function createStorage(ctx: Ctx, name: string): Promise<StorageOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.storage.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) throw new ServiceError("CONFLICT", `Storage "${name}" already exists`, 409);
  const s = await prisma.storage.create({ data: { name } });
  return { id: s.id, name: s.name, isPublished: s.isPublished };
}

export async function updateStorage(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<StorageOutput> {
  requireRole(ctx, "ADMIN");
  const s = await prisma.storage.findFirst({ where: { id } });
  if (!s) throw new ServiceError("NOT_FOUND", "Storage not found", 404);
  const existing = await prisma.storage.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Storage "${name}" already exists`, 409);
  const updated = await prisma.storage.update({ where: { id }, data: { name, ...(isPublished !== undefined && { isPublished }) } });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteStorage(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.storage.deleteMany({ where: { id } });
}

// ─── RAM ─────────────────────────────────────────────────────────────────────

export interface RamOutput {
  id: string;
  name: string;
  isPublished: boolean;
}

export async function listRam(ctx: Ctx): Promise<RamOutput[]> {
  const items = await prisma.ram.findMany({ orderBy: { name: "asc" } });
  return items.map((r) => ({ id: r.id, name: r.name, isPublished: r.isPublished }));
}

export async function createRam(ctx: Ctx, name: string): Promise<RamOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.ram.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) throw new ServiceError("CONFLICT", `RAM "${name}" already exists`, 409);
  const r = await prisma.ram.create({ data: { name } });
  return { id: r.id, name: r.name, isPublished: r.isPublished };
}

export async function updateRam(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<RamOutput> {
  requireRole(ctx, "ADMIN");
  const r = await prisma.ram.findFirst({ where: { id } });
  if (!r) throw new ServiceError("NOT_FOUND", "RAM not found", 404);
  const existing = await prisma.ram.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `RAM "${name}" already exists`, 409);
  const updated = await prisma.ram.update({ where: { id }, data: { name, ...(isPublished !== undefined && { isPublished }) } });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteRam(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.ram.deleteMany({ where: { id } });
}
