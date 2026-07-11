import type { Product, ProductUnit, Sale } from "@/shared/lib/types";
import { getWarrantyStatus, type WarrantyStatus } from "@/features/products/warranty";

export interface WarrantyLookupResult {
  product: Product;
  unit?: ProductUnit;
  /** Effective warranty months — prefer sale CartItem warranty, then unit, then product. */
  warrantyMonths: number;
  /** Warranty start date (ISO). Prefer unit.warrantyStartDate, then sale.date, then product.warrantyStartDate. */
  warrantyStartDate?: string;
  status: WarrantyStatus;
  sale?: Sale;
  /** How the match was made — useful for UI hint. */
  matchedBy: "unit-serial" | "unit-imei" | "product-serial" | "product-imei" | "invoice";
}

const norm = (v?: string) => (v ?? "").trim().toLowerCase();

/**
 * Look up warranty info from a free-text query. Searches:
 *  - per-unit serial / IMEI inside product.serials
 *  - product-level serial / IMEI
 *  - sale invoice number (returns one result per item line in the sale)
 */
export function lookupWarranty(
  query: string,
  products: Product[],
  sales: Sale[],
): WarrantyLookupResult[] {
  const q = norm(query);
  if (!q) return [];

  const results: WarrantyLookupResult[] = [];

  // 1) Per-unit serial / IMEI
  for (const p of products) {
    if (!p.serials) continue;
    for (const u of p.serials) {
      const sn = norm(u.serialNumber);
      const im = norm(u.imei);
      if (sn === q || im === q) {
        const sale = u.soldInSaleId ? sales.find((s) => s.id === u.soldInSaleId) : undefined;
        const cartLine = sale?.items.find((it) => it.productId === p.id);
        const months = cartLine?.warrantyMonths ?? p.warrantyMonths ?? 0;
        const start = u.warrantyStartDate ?? sale?.date ?? u.receivedAt ?? p.warrantyStartDate;
        results.push({
          product: p,
          unit: u,
          warrantyMonths: months,
          warrantyStartDate: start,
          status: getWarrantyStatus({ warrantyMonths: months, warrantyStartDate: start }),
          sale,
          matchedBy: sn === q ? "unit-serial" : "unit-imei",
        });
      }
    }
  }

  // 2) Product-level serial / IMEI
  for (const p of products) {
    const sn = norm(p.serialNumber);
    const im = norm(p.imei);
    if (sn === q || im === q) {
      // Avoid duplicate if also matched as unit
      if (results.some((r) => r.product.id === p.id && !r.unit)) continue;
      const months = p.warrantyMonths ?? 0;
      results.push({
        product: p,
        warrantyMonths: months,
        warrantyStartDate: p.warrantyStartDate,
        status: getWarrantyStatus({ warrantyMonths: months, warrantyStartDate: p.warrantyStartDate }),
        matchedBy: sn === q ? "product-serial" : "product-imei",
      });
    }
  }

  // 3) Invoice number → expand all items
  const sale = sales.find((s) => norm(s.invoiceNo) === q);
  if (sale) {
    for (const line of sale.items) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      // Try to find the specific sold unit linked to this sale
      const unit = product.serials?.find((u) => u.soldInSaleId === sale.id);
      const months = line.warrantyMonths ?? product.warrantyMonths ?? 0;
      const start = unit?.warrantyStartDate ?? sale.date ?? product.warrantyStartDate;
      results.push({
        product,
        unit,
        warrantyMonths: months,
        warrantyStartDate: start,
        status: getWarrantyStatus({ warrantyMonths: months, warrantyStartDate: start }),
        sale,
        matchedBy: "invoice",
      });
    }
  }

  return results;
}
