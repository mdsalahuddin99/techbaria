/**
 * Shared Zod validators for Product. Used by:
 * - Client form (ProductFormDialog)
 * - Server API handlers (apiHandler schema)
 *
 * This file lives in `shared/` so both sides import the same schema.
 * The current Vite app re-exports from `src/features/products/schemas.ts`;
 * after the Next.js port, the feature schema file will be a thin
 * re-export of this one.
 */
import { z } from "zod";

export const productConditionSchema = z.enum(["New", "Used", "Refurbished"]);
export const productTypeSchema = z.enum(["simple", "bundle"]);

const minStockPreprocessor = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return 5;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
}, z.number().int().min(0).max(1_000_000));

export const productBaseSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    slug: z.string().trim().optional(),
    sku: z.string().trim().min(1, "SKU is required").max(60),
    barcode: z.string().trim().max(60).default(""),
    description: z.string().trim().optional().default(""),
    shortDescription: z.string().trim().max(300, "Short description must not exceed 300 characters").optional().default(""),
    category: z.string().trim().min(1).max(80),
    subcategory: z.string().trim().min(1, "Sub-category is required").max(80),
    series: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional(),
    price: z.number().nonnegative().max(99_999_999),
    costPrice: z.number().nonnegative().max(99_999_999),
    wholesalePrice: z.number().nonnegative().max(99_999_999).default(0),
    stock: z.number().int().min(0).max(1_000_000).default(0),
    minStock: minStockPreprocessor,
    unit: z.string().trim().min(1).max(20).default("pcs"),
    active: z.boolean().default(false),
    onlinePrice: z.number().nonnegative().max(99_999_999).nullable().optional(),
    compareAtPrice: z.number().nonnegative().max(99_999_999).nullable().optional(),
    isTrending: z.boolean().optional(),
    isFlashDeal: z.boolean().optional(),
    emoji: z.string().max(8).default("📦"),
    imageUrl: z.string().url().max(2048).optional().or(z.literal("")).transform((v) => v || undefined),
    galleryImages: z.array(z.string().url().or(z.literal(""))).optional().default([]),
    color: z.string().trim().max(40).optional(),
    storage: z.string().trim().max(40).optional(),
    ram: z.string().trim().max(40).optional(),
    warrantyMonths: z.number().int().min(0).max(120).optional(),
    condition: productConditionSchema.default("New"),
    trackSerials: z.boolean().default(true),
    type: productTypeSchema.default("simple"),
    supplierId: z.string().nullable().optional(),
    warrantyStartDate: z.string().trim().max(20).optional(),
    bundleQty: z.number().int().positive().optional(),
  })
  .strict(); // ⚠️ rejects legacy reorderPoint / reorderQty / preferredSupplierId

/**
 * Server-side schema: validates client input, then maps field names
 * to match what the Prisma service layer expects.
 *
 * Transform rules:
 *   costPrice        → cost
 *   minStock         → reorderLevel
 *   active           → isPublished
 *   category (name)  → categoryId (still a name — service resolves to ID)
 *   imageUrl         → stripped (Prisma stores images as relation)
 */
export const productCreateSchema = productBaseSchema.transform((input) => {
  return {
    sku: input.sku,
    barcode: input.barcode || "",
    name: input.name,
    slug: undefined as string | undefined,
    description: input.description || undefined,
    shortDescription: input.shortDescription || undefined,
    categoryId: input.category || undefined,
    imageUrl: input.imageUrl || undefined,
    galleryImages: input.galleryImages,
    price: input.price,
    cost: input.costPrice || 0,
    stock: input.stock || 0,
    reorderLevel: input.minStock,
    unit: input.unit || "pc",
    isPublished: input.active,
    onlinePrice: input.onlinePrice,
    compareAtPrice: input.compareAtPrice,
    // Extended fields — now passed as direct columns
    brand: input.brand,
    model: input.model,
    series: input.series,
    subcategory: input.subcategory,
    color: input.color,
    storage: input.storage,
    ram: input.ram,
    condition: input.condition,
    emoji: input.emoji || "📦",
    wholesalePrice: input.wholesalePrice || 0,
    supplierId: input.supplierId ?? null,
    trackSerials: input.trackSerials,
    type: input.type,
    bundleQty: input.bundleQty,
    warrantyStartDate: input.warrantyStartDate,
    warrantyMonths: input.warrantyMonths,
    isTrending: input.isTrending ?? false,
    isFlashDeal: input.isFlashDeal ?? false,
  };
});

/** Server-side schema for PATCH (all fields optional). */
export const productUpdateSchema = productBaseSchema.partial().transform((input) => {
  const result: Record<string, unknown> = {};
  if (input.sku !== undefined) result.sku = input.sku;
  if (input.barcode !== undefined) result.barcode = input.barcode;
  if (input.name !== undefined) result.name = input.name;
  if (input.description !== undefined) result.description = input.description;
  if (input.shortDescription !== undefined) result.shortDescription = input.shortDescription;
  if (input.category !== undefined) result.categoryId = input.category || null;
  if (input.imageUrl !== undefined) result.imageUrl = input.imageUrl || null;
  if (input.galleryImages !== undefined) result.galleryImages = input.galleryImages;
  if (input.price !== undefined) result.price = input.price;
  if (input.costPrice !== undefined) result.cost = input.costPrice;
  if (input.stock !== undefined) result.stock = input.stock;
  if (input.minStock !== undefined) result.reorderLevel = input.minStock;
  if (input.unit !== undefined) result.unit = input.unit;
  if (input.active !== undefined) result.isPublished = input.active;
  if (input.onlinePrice !== undefined) result.onlinePrice = input.onlinePrice;
  if (input.compareAtPrice !== undefined) result.compareAtPrice = input.compareAtPrice;
  // Extended fields
  if (input.brand !== undefined) result.brand = input.brand;
  if (input.model !== undefined) result.model = input.model;
  if (input.series !== undefined) result.series = input.series;
  if (input.subcategory !== undefined) result.subcategory = input.subcategory;
  if (input.color !== undefined) result.color = input.color;
  if (input.storage !== undefined) result.storage = input.storage;
  if (input.ram !== undefined) result.ram = input.ram;
  if (input.condition !== undefined) result.condition = input.condition;
  if (input.emoji !== undefined) result.emoji = input.emoji;
  if (input.wholesalePrice !== undefined) result.wholesalePrice = input.wholesalePrice;
  if (input.supplierId !== undefined) result.supplierId = input.supplierId;
  if (input.trackSerials !== undefined) result.trackSerials = input.trackSerials;
  if (input.type !== undefined) result.type = input.type;
  if (input.bundleQty !== undefined) result.bundleQty = input.bundleQty;
  if (input.warrantyStartDate !== undefined) result.warrantyStartDate = input.warrantyStartDate;
  // warrantyMonths — now a direct column
  if (input.warrantyMonths !== undefined) result.warrantyMonths = input.warrantyMonths;
  if (input.isTrending !== undefined) result.isTrending = input.isTrending;
  if (input.isFlashDeal !== undefined) result.isFlashDeal = input.isFlashDeal;
  return result;
});

/** Strip any legacy reorder fields from arbitrary input (defensive). */
export function stripLegacyReorderFields<T extends Record<string, unknown>>(input: T): T {
   
  const { reorderPoint, reorderQty, preferredSupplierId, ...rest } = input as Record<string, unknown>;
  return rest as T;
}
