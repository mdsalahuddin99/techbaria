import type { Product } from "@/shared/lib/types";
import type { LabelItem, LabelScope } from "./types";

/**
 * Build the list of labels to print for a set of products and a scope.
 * - `one_each`: 1 label per product
 * - `in_stock`: if product has serials, 1 label per `in_stock` unit;
 *               otherwise N copies of a generic label where N = product.stock
 * - `all_units`: if product has serials, 1 label per registered unit;
 *                otherwise behaves like `in_stock`
 */
export function buildLabelItems(products: Product[], scope: LabelScope): LabelItem[] {
  const out: LabelItem[] = [];
  let idx = 0;
  for (const product of products) {
    if (scope === "one_each") {
      out.push({ product, key: `${product.id}-${idx++}` });
      continue;
    }

    const serials = product.serials ?? [];
    if (serials.length > 0) {
      const units = scope === "all_units"
        ? serials
        : serials.filter((u) => u.status === "in_stock");
      for (const unit of units) {
        out.push({ product, unit, key: `${product.id}-${idx++}-${unit.id}` });
      }
      continue;
    }

    // No serials configured — fall back to N generic copies.
    const copies = Math.max(1, product.stock || 0);
    for (let i = 0; i < copies; i++) {
      out.push({ product, key: `${product.id}-${idx++}` });
    }
  }
  return out;
}
