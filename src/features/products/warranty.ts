import type { Product } from "@/shared/lib/types";

/** Warranty status for a product. */
export type WarrantyStatus =
  | { kind: "none" }
  | { kind: "active"; endDate: Date; daysLeft: number; nearExpiry: boolean }
  | { kind: "expired"; endDate: Date; daysAgo: number };

/** Default threshold (days) before expiry that we consider "near expiry". */
export const NEAR_EXPIRY_DAYS = 30;

/** Compute warranty end date for a product, returns null when no warranty configured. */
export function getWarrantyEndDate(p: Pick<Product, "warrantyMonths" | "warrantyStartDate" | "serials">): Date | null {
  let months = Number(p.warrantyMonths) || 0;
  let start = p.warrantyStartDate ? new Date(p.warrantyStartDate) : null;

  if (!months && p.serials && p.serials.length > 0) {
    const unitWithWarranty = p.serials.find((s) => s.warrantyMonths && s.warrantyMonths > 0);
    if (unitWithWarranty) {
      months = Number(unitWithWarranty.warrantyMonths) || 0;
      start = unitWithWarranty.warrantyStartDate ? new Date(unitWithWarranty.warrantyStartDate) : null;
    }
  }

  if (!months) return null;
  const startDate = start && !Number.isNaN(start.getTime()) ? start : new Date();
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + months);
  return end;
}

/** Compute warranty status for a product. */
export function getWarrantyStatus(
  p: Pick<Product, "warrantyMonths" | "warrantyStartDate" | "serials">,
  threshold = NEAR_EXPIRY_DAYS,
): WarrantyStatus {
  const end = getWarrantyEndDate(p);
  if (!end) return { kind: "none" };
  const now = Date.now();
  const diffMs = end.getTime() - now;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { kind: "expired", endDate: end, daysAgo: -days };
  return { kind: "active", endDate: end, daysLeft: days, nearExpiry: days <= threshold };
}

/** Format warranty end date as e.g. "12 Mar 2027". */
export function formatWarrantyEnd(end: Date): string {
  return end.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Find products with duplicate IMEI or Serial Number against a candidate.
 * Comparison is case-insensitive and trimmed; empty values are ignored.
 */
export function findDuplicateIdentifiers(
  products: Product[],
  candidate: { id?: string; imei?: string; serialNumber?: string },
): { imei?: Product; serialNumber?: Product } {
  const imei = candidate.imei?.trim().toLowerCase();
  const sn = candidate.serialNumber?.trim().toLowerCase();
  const result: { imei?: Product; serialNumber?: Product } = {};
  if (!imei && !sn) return result;
  for (const p of products) {
    if (p.id === candidate.id) continue;
    if (imei && p.imei && p.imei.trim().toLowerCase() === imei) {
      result.imei = p;
    }
    if (sn && p.serialNumber && p.serialNumber.trim().toLowerCase() === sn) {
      result.serialNumber = p;
    }
    if (result.imei && result.serialNumber) break;
  }
  return result;
}
