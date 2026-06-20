/**
 * Catalog hierarchy service — brands, product names, models, series.
 * Minimal CRUD for cascading dropdowns in Product form.
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
  categoryId: string;
}

export async function listBrands(ctx: Ctx, categoryId: string): Promise<BrandOutput[]> {
  if (categoryId === "all") {
    const items = await prisma.categoryBrand.findMany({
      orderBy: { name: "asc" },
    });
    return items.map((b) => ({ id: b.id, name: b.name, categoryId: b.categoryId }));
  }
  const items = await prisma.categoryBrand.findMany({
    where: { categoryId },
    orderBy: { name: "asc" },
  });
  return items.map((b) => ({ id: b.id, name: b.name, categoryId: b.categoryId }));
}

export async function createBrand(ctx: Ctx, name: string, categoryId: string): Promise<BrandOutput> {
  requireRole(ctx, "MANAGER");
  const existing = await prisma.categoryBrand.findUnique({
    where: { categoryId_name: { categoryId, name } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Brand "${name}" already exists`, 409);
  const b = await prisma.categoryBrand.create({ data: { name, categoryId } });
  return { id: b.id, name: b.name, categoryId: b.categoryId };
}

export async function updateBrand(ctx: Ctx, id: string, name: string): Promise<BrandOutput> {
  requireRole(ctx, "MANAGER");
  const b = await prisma.categoryBrand.findFirst({
    where: { id },
  });
  if (!b) throw new ServiceError("NOT_FOUND", "Brand not found", 404);
  const existing = await prisma.categoryBrand.findUnique({
    where: { categoryId_name: { categoryId: b.categoryId, name } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Brand "${name}" already exists`, 409);
  const updated = await prisma.categoryBrand.update({
    where: { id },
    data: { name },
  });
  return { id: updated.id, name: updated.name, categoryId: updated.categoryId };
}

export async function deleteBrand(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "MANAGER");
  await prisma.categoryBrand.deleteMany({
    where: { id },
  });
}

// ─── Product Names ────────────────────────────────────────────────────────────

export interface ProductNameOutput {
  id: string;
  name: string;
  brandId: string;
}

export async function listProductNames(ctx: Ctx, brandId: string): Promise<ProductNameOutput[]> {
  if (brandId === "all") {
    const items = await prisma.subcategoryProduct.findMany({
      orderBy: { name: "asc" },
    });
    return items.map((p) => ({ id: p.id, name: p.name, brandId: p.brandId }));
  }
  const items = await prisma.subcategoryProduct.findMany({
    where: { brandId },
    orderBy: { name: "asc" },
  });
  return items.map((p) => ({ id: p.id, name: p.name, brandId: p.brandId }));
}

export async function createProductName(ctx: Ctx, name: string, brandId: string): Promise<ProductNameOutput> {
  requireRole(ctx, "MANAGER");
  const existing = await prisma.subcategoryProduct.findUnique({
    where: { brandId_name: { brandId, name } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Product name "${name}" already exists`, 409);
  const p = await prisma.subcategoryProduct.create({ data: { name, brandId } });
  return { id: p.id, name: p.name, brandId: p.brandId };
}

export async function updateProductName(ctx: Ctx, id: string, name: string): Promise<ProductNameOutput> {
  requireRole(ctx, "MANAGER");
  const p = await prisma.subcategoryProduct.findFirst({
    where: { id },
  });
  if (!p) throw new ServiceError("NOT_FOUND", "Product name not found", 404);
  const existing = await prisma.subcategoryProduct.findUnique({
    where: { brandId_name: { brandId: p.brandId, name } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Product name "${name}" already exists`, 409);
  const updated = await prisma.subcategoryProduct.update({
    where: { id },
    data: { name },
  });
  return { id: updated.id, name: updated.name, brandId: updated.brandId };
}

export async function deleteProductName(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "MANAGER");
  await prisma.subcategoryProduct.deleteMany({
    where: { id },
  });
}

// ─── Models ──────────────────────────────────────────────────────────────────

export interface ModelOutput {
  id: string;
  name: string;
  productId: string;
}

export async function listModels(ctx: Ctx, productId: string): Promise<ModelOutput[]> {
  if (productId === "all") {
    const items = await prisma.subcategoryModel.findMany({
      orderBy: { name: "asc" },
    });
    return items.map((m) => ({ id: m.id, name: m.name, productId: m.productId }));
  }
  const items = await prisma.subcategoryModel.findMany({
    where: { productId },
    orderBy: { name: "asc" },
  });
  return items.map((m) => ({ id: m.id, name: m.name, productId: m.productId }));
}

export async function createModel(ctx: Ctx, name: string, productId: string): Promise<ModelOutput> {
  requireRole(ctx, "MANAGER");
  const existing = await prisma.subcategoryModel.findUnique({
    where: { productId_name: { productId, name } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Model "${name}" already exists`, 409);
  const m = await prisma.subcategoryModel.create({ data: { name, productId } });
  return { id: m.id, name: m.name, productId: m.productId };
}

export async function updateModel(ctx: Ctx, id: string, name: string): Promise<ModelOutput> {
  requireRole(ctx, "MANAGER");
  const m = await prisma.subcategoryModel.findFirst({
    where: { id },
  });
  if (!m) throw new ServiceError("NOT_FOUND", "Model not found", 404);
  const existing = await prisma.subcategoryModel.findUnique({
    where: { productId_name: { productId: m.productId, name } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Model "${name}" already exists`, 409);
  const updated = await prisma.subcategoryModel.update({
    where: { id },
    data: { name },
  });
  return { id: updated.id, name: updated.name, productId: updated.productId };
}

export async function deleteModel(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "MANAGER");
  await prisma.subcategoryModel.deleteMany({
    where: { id },
  });
}

// ─── Series ──────────────────────────────────────────────────────────────────

export interface SeriesOutput {
  id: string;
  name: string;
  modelId: string;
}

export async function listSeries(ctx: Ctx, modelId: string): Promise<SeriesOutput[]> {
  if (modelId === "all") {
    const items = await prisma.subcategorySeries.findMany({
      orderBy: { name: "asc" },
    });
    return items.map((s) => ({ id: s.id, name: s.name, modelId: s.modelId }));
  }
  const items = await prisma.subcategorySeries.findMany({
    where: { modelId },
    orderBy: { name: "asc" },
  });
  return items.map((s) => ({ id: s.id, name: s.name, modelId: s.modelId }));
}

export async function createSeries(ctx: Ctx, name: string, modelId: string): Promise<SeriesOutput> {
  requireRole(ctx, "MANAGER");
  const existing = await prisma.subcategorySeries.findUnique({
    where: { modelId_name: { modelId, name } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Series "${name}" already exists`, 409);
  const s = await prisma.subcategorySeries.create({ data: { name, modelId } });
  return { id: s.id, name: s.name, modelId: s.modelId };
}

export async function updateSeries(ctx: Ctx, id: string, name: string): Promise<SeriesOutput> {
  requireRole(ctx, "MANAGER");
  const s = await prisma.subcategorySeries.findFirst({
    where: { id },
  });
  if (!s) throw new ServiceError("NOT_FOUND", "Series not found", 404);
  const existing = await prisma.subcategorySeries.findUnique({
    where: { modelId_name: { modelId: s.modelId, name } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Series "${name}" already exists`, 409);
  const updated = await prisma.subcategorySeries.update({
    where: { id },
    data: { name },
  });
  return { id: updated.id, name: updated.name, modelId: updated.modelId };
}

export async function deleteSeries(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "MANAGER");
  await prisma.subcategorySeries.deleteMany({
    where: { id },
  });
}
