/**
 * Thermal label preset templates. Sizes are physical dimensions
 * (millimetres) — the print stylesheet uses them in @page so the
 * printer feeds exactly one label per page (no A4 fallback).
 */

export interface LabelTemplate {
  id: string;
  name: string;
  /** Width in millimetres. */
  widthMm: number;
  /** Height in millimetres. */
  heightMm: number;
  /** Barcode bar height in pixels (jsbarcode). */
  barcodeHeightPx: number;
  /** Base font size in pixels for the label body. */
  baseFontPx: number;
  /** Optional notes shown in the size picker. */
  description?: string;
}

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    id: "tsc-50x30",
    name: "50 × 30 mm",
    widthMm: 50,
    heightMm: 30,
    barcodeHeightPx: 36,
    baseFontPx: 11,
    description: "Standard mobile/electronics shelf label",
  },
  {
    id: "tsc-40x30",
    name: "40 × 30 mm",
    widthMm: 40,
    heightMm: 30,
    barcodeHeightPx: 32,
    baseFontPx: 10,
    description: "Compact retail label",
  },
  {
    id: "tsc-38x25",
    name: "38 × 25 mm",
    widthMm: 38,
    heightMm: 25,
    barcodeHeightPx: 28,
    baseFontPx: 9,
    description: "Small jewellery / accessory tag",
  },
  {
    id: "tsc-70x40",
    name: "70 × 40 mm",
    widthMm: 70,
    heightMm: 40,
    barcodeHeightPx: 48,
    baseFontPx: 13,
    description: "Large carton / box label",
  },
  {
    id: "tsc-100x50",
    name: "100 × 50 mm",
    widthMm: 100,
    heightMm: 50,
    barcodeHeightPx: 60,
    baseFontPx: 14,
    description: "Shipping / wide product label",
  },
];

export const DEFAULT_TEMPLATE_ID = "tsc-50x30";

export const getTemplate = (id: string): LabelTemplate =>
  LABEL_TEMPLATES.find((t) => t.id === id) ?? LABEL_TEMPLATES[0];
