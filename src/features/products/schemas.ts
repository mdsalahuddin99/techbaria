import { z } from "zod";

/**
 * Centralized Zod schemas for product entities.
 * Used by react-hook-form resolvers and any future server-side validation.
 *
 * NOTE: Pricing/stock/serial fields are intentionally optional here because
 * Products are now catalog *templates* — actual cost, sale price and
 * per-unit serials are captured at Purchase time.
 */

export const conditionEnum = z.enum(["New", "Used", "Refurbished"]);

const optStr = z.string().trim().max(80).optional().or(z.literal(""));
const optNum = z.coerce.number().nonnegative().optional().or(z.literal(""));

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  sku: z.string().trim().min(1, "SKU is required").max(40),
  barcode: z.string().trim().max(40).optional().default(""),
  description: z.string().trim().optional().default(""),
  shortDescription: z.string().trim().max(300, "Short description must not exceed 300 characters").optional().default(""),
  // Category & sub-category are dynamic strings (managed in Categories page).
  category: z.string().trim().min(1, "Category is required"),
  subcategory: optStr,
  series: optStr,
  // Pricing/stock are optional — set via Purchase, kept here for legacy edits.
  price: optNum,
  costPrice: optNum,
  wholesalePrice: optNum,
  stock: optNum,
  minStock: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return 5;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
    },
    z.number().int().nonnegative()
  ),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  active: z.boolean().default(false),
  isTrending: z.boolean().optional(),
  emoji: z.string().trim().min(1).max(8).default("📦"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  galleryImages: z.array(z.string().url().or(z.literal(""))).optional().default([]),
  supplierId: z.string().nullable().optional(),
  // ---- Electronics-specific (all optional) ----
  brand: optStr,
  model: optStr,
  serialNumber: optStr,
  imei: optStr,
  color: optStr,
  storage: optStr,
  ram: optStr,
  warrantyMonths: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  warrantyStartDate: z.string().optional().or(z.literal("")),
  condition: conditionEnum.optional().or(z.literal("")),
  trackSerials: z.boolean().default(false),
  // ---- Phase 4: bundle ----
  type: z.enum(["simple", "bundle"]).default("simple"),
  components: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.coerce.number().positive(),
      })
    )
    .optional()
    .default([]),
}).strict();

/**
 * Legacy fields that were removed in favour of `minStock` as the
 * single source of truth. Listed here so cleanup helpers stay in sync.
 */
export const LEGACY_REORDER_FIELDS = [
  "reorderPoint",
  "reorderQty",
  "preferredSupplierId",
] as const;

/** Strip legacy reorder fields from any product-like object (mutates a copy). */
export function stripLegacyReorderFields<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const clone: Record<string, unknown> = { ...obj };
  for (const k of LEGACY_REORDER_FIELDS) delete clone[k];
  return clone as T;
}

export type ProductFormValues = z.infer<typeof productSchema>;
