export const CURRENCY = "৳";

/**
 * Round a monetary amount to 2 decimal places, eliminating floating-point
 * artifacts (e.g. 0.1 + 0.2 → 0.3 instead of 0.30000000000000004).
 * Returns 0 for non-finite inputs.
 */
export function round2(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  // Use EPSILON nudge to handle binary-fp rounding edge cases.
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Format a money amount. Pass a locale (e.g. "bn-BD") to render the digits
 * in that locale's numeral system — e.g. Bangla `১,২৩৪.৫৬`.
 * Defaults to Indian English grouping (`1,23,456.78`).
 */
export function formatCurrency(amount: number | string, locale: string = "en-IN"): string {
  const parsed = typeof amount === "string" ? Number(amount) : amount;
  const n = Number.isFinite(parsed) ? parsed : 0;
  return `${CURRENCY}${n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB");
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function genInvoiceNo(seq: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

export function productDisplayName(p: any): string {
  const parts: string[] = [];
  const brandObj = p.globalBrand || p.brand;
  const brandName = typeof brandObj === 'object' && brandObj !== null ? brandObj.name : brandObj;
  if (brandName) parts.push(brandName);
  parts.push(p.name);
  const modelObj = p.globalModel || p.model;
  const modelName = typeof modelObj === 'object' && modelObj !== null ? modelObj.name : modelObj;
  if (modelName) parts.push(`Model ${modelName}`);
  const seriesObj = p.globalSeries || p.series;
  const seriesName = typeof seriesObj === 'object' && seriesObj !== null ? seriesObj.name : seriesObj;
  if (seriesName) parts.push(seriesName);
  return parts.join(" ");
}
