/**
 * Category is a free-form string. Users manage their own categories in the
 * Categories page; we no longer enforce a fixed union so custom categories
 * don't need unsafe `as Category` casts. Keep the alias for readability.
 */
export type Category = string;

export interface CategoryRecord {
  id: string;
  name: string;
  parentId?: string | null;
  order: number;
  active?: boolean;
}

export type ProductCondition = "New" | "Used" | "Refurbished";

/** Status of an individual tracked unit (per-IMEI / per-serial inventory). */
export type ProductUnitStatus = "in_stock" | "sold" | "returned" | "damaged";

/**
 * A single tracked unit belonging to a product. Used for serialized goods
 * (mobiles, laptops). When a product has `serials`, its `stock` is derived
 * from the count of `in_stock` units rather than maintained manually.
 */
export interface ProductUnit {
  id: string;
  imei?: string;
  serialNumber?: string;
  status: ProductUnitStatus;
  /** ISO date the unit became inventory (purchase / restock). */
  receivedAt?: string;
  /** ISO date the warranty starts; if absent we fall back to `receivedAt`. */
  warrantyStartDate?: string;
  warrantyMonths?: number;
  /** Sale id when the unit was sold. */
  soldInSaleId?: string;
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode: string;
  category: Category;
  price: number;
  costPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  unit: string;
  active: boolean;
  isTrending?: boolean;
  isFlashDeal?: boolean;
  emoji: string;
  imageUrl?: string;
  galleryImages?: string[];
  supplierId?: string | null;
  // ---- Electronics-specific (optional) ----
  /** Optional sub-category name (child of `category`). */
  subcategory?: string;
  productTypeId?: string;
  /** Product series / line (e.g. "Galaxy A", "iPhone 15", "ThinkPad"). */
  series?: string;
  seriesId?: string;
  globalSeriesId?: string;
  brand?: string;
  /** FK id for the brand (CategoryBrand). Used when submitting the product form. */
  brandId?: string;
  globalBrandId?: string;
  model?: string;
  /** FK id for the model (SubcategoryModel). Used when submitting the product form. */
  modelId?: string;
  globalModelId?: string;
  catalogProductId?: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  storage?: string;
  ram?: string;
  warrantyMonths?: number;
  /** ISO date (YYYY-MM-DD) when warranty starts; defaults to product creation date. */
  warrantyStartDate?: string;
  condition?: ProductCondition;
  /**
   * When true, every unit must be added via barcode/serial scan in Purchases
   * (CCTV, mobile, laptop, etc). When false, Purchases accepts a manual
   * quantity (cables, accessories, consumables). Defaults to true.
   */
  trackSerials?: boolean;
  /** Per-unit tracking for serialized inventory. Optional. */
  serials?: ProductUnit[];

  /** Default discount to remember and auto-suggest at sale time. */
  defaultDiscount?: { mode: "amount" | "percent"; value: number };

  // ---- Bundle / Kit (Phase 4) ----
  /** 'simple' (default) or 'bundle' (composed of other products). */
  type?: "simple" | "bundle";
  /** Component products that make up this bundle. Stock for the bundle is derived from these. */
  components?: BundleComponent[];
}

export interface BundleComponent {
  productId: string;
  qty: number;
}

export type ProductInput = Omit<Product, "id">;

