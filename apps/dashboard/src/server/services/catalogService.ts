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
}

export async function listBrands(ctx: Ctx): Promise<BrandOutput[]> {
  const items = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  return items.map((b) => ({ id: b.id, name: b.name, isPublished: b.isPublished }));
}

export async function createBrand(ctx: Ctx, name: string): Promise<BrandOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Brand "${name}" already exists`, 409);
  const b = await prisma.brand.create({ data: { name } });
  return { id: b.id, name: b.name, isPublished: b.isPublished };
}

export async function updateBrand(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<BrandOutput> {
  requireRole(ctx, "ADMIN");
  const b = await prisma.brand.findFirst({ where: { id } });
  if (!b) throw new ServiceError("NOT_FOUND", "Brand not found", 404);
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Brand "${name}" already exists`, 409);
  const updated = await prisma.brand.update({ 
    where: { id }, 
    data: { name, ...(isPublished !== undefined && { isPublished }) } 
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteBrand(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.brand.deleteMany({ where: { id } });
}

// ─── Product Names (Product Types) ────────────────────────────────────────────

export interface ProductNameOutput {
  id: string;
  name: string;
  isPublished: boolean;
}

export async function listProductNames(ctx: Ctx): Promise<ProductNameOutput[]> {
  const items = await prisma.productType.findMany({
    orderBy: { name: "asc" },
  });
  return items.map((p) => ({ id: p.id, name: p.name, isPublished: p.isPublished }));
}

export async function createProductName(ctx: Ctx, name: string): Promise<ProductNameOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.productType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Product name "${name}" already exists`, 409);
  const p = await prisma.productType.create({ data: { name } });
  return { id: p.id, name: p.name, isPublished: p.isPublished };
}

export async function updateProductName(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<ProductNameOutput> {
  requireRole(ctx, "ADMIN");
  const p = await prisma.productType.findFirst({ where: { id } });
  if (!p) throw new ServiceError("NOT_FOUND", "Product name not found", 404);
  const existing = await prisma.productType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Product name "${name}" already exists`, 409);
  const updated = await prisma.productType.update({ 
    where: { id }, 
    data: { name, ...(isPublished !== undefined && { isPublished }) } 
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteProductName(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.productType.deleteMany({ where: { id } });
}

// ─── Models ──────────────────────────────────────────────────────────────────

export interface ModelOutput {
  id: string;
  name: string;
  isPublished: boolean;
}

export async function listModels(ctx: Ctx): Promise<ModelOutput[]> {
  const items = await prisma.model.findMany({
    orderBy: { name: "asc" },
  });
  return items.map((m) => ({ id: m.id, name: m.name, isPublished: m.isPublished }));
}

export async function createModel(ctx: Ctx, name: string): Promise<ModelOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.model.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Model "${name}" already exists`, 409);
  const m = await prisma.model.create({ data: { name } });
  return { id: m.id, name: m.name, isPublished: m.isPublished };
}

export async function updateModel(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<ModelOutput> {
  requireRole(ctx, "ADMIN");
  const m = await prisma.model.findFirst({ where: { id } });
  if (!m) throw new ServiceError("NOT_FOUND", "Model not found", 404);
  const existing = await prisma.model.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Model "${name}" already exists`, 409);
  const updated = await prisma.model.update({ 
    where: { id }, 
    data: { name, ...(isPublished !== undefined && { isPublished }) } 
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteModel(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.model.deleteMany({ where: { id } });
}

// ─── Series ──────────────────────────────────────────────────────────────────

export interface SeriesOutput {
  id: string;
  name: string;
  isPublished: boolean;
}

export async function listSeries(ctx: Ctx): Promise<SeriesOutput[]> {
  const items = await prisma.series.findMany({
    orderBy: { name: "asc" },
  });
  return items.map((s) => ({ id: s.id, name: s.name, isPublished: s.isPublished }));
}

export async function createSeries(ctx: Ctx, name: string): Promise<SeriesOutput> {
  requireRole(ctx, "ADMIN");
  const existing = await prisma.series.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ServiceError("CONFLICT", `Series "${name}" already exists`, 409);
  const s = await prisma.series.create({ data: { name } });
  return { id: s.id, name: s.name, isPublished: s.isPublished };
}

export async function updateSeries(ctx: Ctx, id: string, name: string, isPublished?: boolean): Promise<SeriesOutput> {
  requireRole(ctx, "ADMIN");
  const s = await prisma.series.findFirst({ where: { id } });
  if (!s) throw new ServiceError("NOT_FOUND", "Series not found", 404);
  const existing = await prisma.series.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing && existing.id !== id) throw new ServiceError("CONFLICT", `Series "${name}" already exists`, 409);
  const updated = await prisma.series.update({ 
    where: { id }, 
    data: { name, ...(isPublished !== undefined && { isPublished }) } 
  });
  return { id: updated.id, name: updated.name, isPublished: updated.isPublished };
}

export async function deleteSeries(ctx: Ctx, id: string): Promise<void> {
  requireRole(ctx, "ADMIN");
  await prisma.series.deleteMany({ where: { id } });
}
