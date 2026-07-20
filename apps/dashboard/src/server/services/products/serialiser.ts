import { prisma } from "@/server/db/client";

type PrismaProduct = NonNullable<Awaited<ReturnType<typeof prisma.product.findFirst>>>;

export function serialise(product: PrismaProduct[]): any[];
export function serialise(product: PrismaProduct): any;
export function serialise(product: any): any {
  if (Array.isArray(product)) return product.map((p) => serialiseOne(p));
  return serialiseOne(product);
}

export function serialiseOne(p: any) {
  return {
    ...p,
    // Override Decimal fields from spread with plain numbers
    price: Number(p.price),
    cost: Number(p.cost),
    category: (p as any).category?.name ?? (p as any).category ?? "",
    // Frontend type uses `active` but Prisma stores `isPublished`
    active: p.isPublished,
    isFlashDeal: p.isFlashDeal ?? false,
    // Frontend type uses `costPrice` but Prisma stores `cost`
    costPrice: Number(p.cost),
    onlinePrice: p.onlinePrice ? Number(p.onlinePrice) : undefined,
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    // Frontend type uses `wholesalePrice` — now stored directly
    wholesalePrice: Number(p.wholesalePrice ?? 0),
    // Frontend type uses `minStock` but Prisma stores `reorderLevel`
    minStock: p.reorderLevel,
    // Frontend type uses `imageUrl` but Prisma stores images as relation array
    imageUrl: ((p as any).images as Array<{ url: string }> | undefined)?.[0]?.url ?? "",
    galleryImages: ((p as any).images as Array<{ url: string }> | undefined)?.slice(1).map(img => img.url) ?? [],
    description: p.description ?? "",
    shortDescription: p.shortDescription ?? "",
    // Extended fields — expose both display names AND FK IDs for edit form
    emoji: p.emoji ?? "📦",
    brand: p.globalBrand?.name ?? p.globalBrand ?? "",
    brandId: p.globalBrandId ?? p.globalBrand?.id ?? undefined,
    model: p.globalModel?.name ?? p.globalModel ?? "",
    modelId: p.globalModelId ?? p.globalModel?.id ?? undefined,
    catalogProductId: undefined,
    subcategory: p.subcategory ?? "",
    series: p.globalSeries?.name ?? p.globalSeries ?? "",
    seriesId: p.globalSeriesId ?? p.globalSeries?.id ?? undefined,
    color: p.color ?? "",
    storage: p.storage ?? "",
    ram: p.ram ?? "",
    condition: p.condition ?? undefined,
    trackSerials: p.trackSerials ?? true,
    supplierId: p.supplierId ?? null,
    warrantyStartDate: p.warrantyStartDate ?? undefined,
    warrantyMonths: p.warrantyMonths ?? undefined,
    serialNumber: "",
    imei: "",
    defaultDiscount: undefined,
    type: (p.bundleQty != null && p.bundleQty > 0) ? "bundle" : "simple",
    components: [],
    serials: (p.serialNumbers ?? []).map((s: any) => ({
      imei: undefined,
      serialNumber: s.serial ?? undefined,
      status: "in_stock" as const,
      id: s.id ?? "",
      receivedAt: undefined,
      warrantyStartDate: s.purchaseItem?.warrantyStartDate
        ? new Date(s.purchaseItem.warrantyStartDate).toISOString().slice(0, 10)
        : undefined,
      warrantyMonths: s.purchaseItem?.warrantyMonths ?? undefined,
      soldInSaleId: undefined,
      note: undefined,
    })),
    warehouseStocks: p.warehouseStocks,
    searchTags: p.searchTags ?? [],
  };
}

/**
 * ─── STOREFRONT-SAFE SERIALISER ─────────────────────────────────────────────
 * Only exposes fields that are safe for anonymous public access.
 * Never exposes: cost, wholesalePrice, supplierId, reorderLevel, brandId, modelId.
 * Used by /api/storefront/products — keep it lean for faster payloads.
 */
export function serialiseStorefront(product: any[]): StorefrontProduct[];
export function serialiseStorefront(product: any): StorefrontProduct;
export function serialiseStorefront(product: any): any {
  if (Array.isArray(product)) return product.map((p) => serialiseStorefrontOne(p));
  return serialiseStorefrontOne(product);
}

export interface StorefrontProduct {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl: string;        // primary image (backward-compat)
  images: string[];        // all image URLs in order
  emoji: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  color: string;
  storage: string;
  ram: string;
  active: boolean;
  sku: string | null;
  description: string;
  shortDescription: string;
  condition: string | undefined;
  warrantyMonths: number | undefined;
  defaultDiscount: { mode: "percent" | "amount"; value: number } | undefined;
  isTrending: boolean;
  isFlashDeal: boolean;
  type: "simple" | "bundle";
  components: any[];
}

function serialiseStorefrontOne(p: any): StorefrontProduct {
  // Extract defaultDiscount safely (stored as JSON or object)
  let defaultDiscount: StorefrontProduct["defaultDiscount"] = undefined;
  if (p.defaultDiscount && typeof p.defaultDiscount === "object") {
    const d = p.defaultDiscount as any;
    if (d.value && d.value > 0) {
      defaultDiscount = { mode: d.mode ?? "percent", value: Number(d.value) };
    }
  }

  const allImages = ((p.images as Array<{ url: string }> | undefined) ?? []).map((img) => img.url);

  return {
    id: p.id,
    slug: p.slug ?? null,
    name: p.name,
    price: p.onlinePrice ? Number(p.onlinePrice) : Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    stock: p.stock ?? 0,
    imageUrl: allImages[0] ?? "",
    images: allImages,
    emoji: p.emoji ?? "📦",
    category: p.category?.name ?? p.category ?? "",
    subcategory: p.subcategory ?? "",
    brand: p.globalBrand?.name ?? p.globalBrand ?? "",
    model: p.globalModel?.name ?? p.globalModel ?? "",
    color: p.color ?? "",
    storage: p.storage ?? "",
    ram: p.ram ?? "",
    active: p.isPublished ?? true,
    sku: p.sku ?? null,
    description: p.description ?? "",
    shortDescription: p.shortDescription ?? "",
    condition: p.condition ?? undefined,
    warrantyMonths: p.warrantyMonths ?? undefined,
    defaultDiscount,
    isTrending: p.isTrending ?? false,
    isFlashDeal: p.isFlashDeal ?? false,
    type: (p.bundleQty != null && p.bundleQty > 0) ? "bundle" : "simple",
    components: p.components ?? [],
  };
}
