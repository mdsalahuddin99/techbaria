import type { Product, ProductUnit } from "@/shared/lib/types";

/** A single label render request — one product, optionally bound to a unit. */
export interface LabelItem {
  product: Product;
  /** When set, the label shows this unit's IMEI/Serial. */
  unit?: ProductUnit;
  /** Stable key for React lists. */
  key: string;
}

/** Which units to print labels for. */
export type LabelScope =
  /** N copies based on the product's available stock count. */
  | "in_stock"
  /** One label per registered unit (regardless of status). */
  | "all_units"
  /** Single label per product. */
  | "one_each";
