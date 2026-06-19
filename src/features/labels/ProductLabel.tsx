import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import type { Product, ProductUnit } from "@/shared/lib/types";
import { formatCurrency, productDisplayName } from "@/shared/lib/format";
import { useT, useLocale } from "@/features/i18n";
import type { LabelTemplate } from "./templates";

export type LabelCodeType = "barcode" | "qr";

interface Props {
  product: Product;
  unit?: ProductUnit;
  template: LabelTemplate;
  shopName?: string;
  showShop?: boolean;
  showPrice?: boolean;
  codeType?: LabelCodeType;
}

/**
 * Renders a single thermal label at exact physical dimensions.
 * Sized in mm so the print stylesheet's @page rule produces a 1:1 output.
 */
export function ProductLabel({
  product,
  unit,
  template,
  shopName,
  showShop = false,
  showPrice = true,
  codeType = "barcode",
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const code = product.barcode || product.sku;
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    if (!code) return;
    if (codeType === "qr") {
      if (!canvasRef.current) return;
      // Encode product info — scanner can read just the barcode/SKU.
      QRCode.toCanvas(canvasRef.current, code, {
        width: template.barcodeHeightPx + 40,
        margin: 0,
        color: { dark: "#000000", light: "#ffffff" },
      }).catch(() => { /* ignore */ });
      return;
    }
    if (!svgRef.current) return;
    const isEan13 = /^\d{13}$/.test(code);
    try {
      JsBarcode(svgRef.current, code, {
        format: isEan13 ? "EAN13" : "CODE128",
        width: 1.4,
        height: template.barcodeHeightPx,
        displayValue: true,
        fontSize: template.baseFontPx,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      try {
        JsBarcode(svgRef.current, code, {
          format: "CODE128",
          width: 1.4,
          height: template.barcodeHeightPx,
          displayValue: true,
          fontSize: template.baseFontPx,
          margin: 0,
        });
      } catch {
        /* ignore unprintable code */
      }
    }
  }, [code, codeType, template.barcodeHeightPx, template.baseFontPx]);

  const serialLine = unit?.imei || unit?.serialNumber || product.imei || product.serialNumber;
  const isImei = Boolean(unit?.imei || product.imei);
  const serialLabel = isImei ? t("label.imei") : t("label.serial");

  return (
    <div
      className="product-label"
      style={{
        width: `${template.widthMm}mm`,
        height: `${template.heightMm}mm`,
        padding: "1mm 1.5mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#fff",
        color: "#000",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {showShop && shopName && (
        <div style={{ fontSize: template.baseFontPx - 2, fontWeight: 600, lineHeight: 1.05 }}>
          {shopName}
        </div>
      )}
      <div
        style={{
          fontSize: template.baseFontPx,
          fontWeight: 700,
          lineHeight: 1.1,
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {productDisplayName(product)}
      </div>
      {codeType === "qr" ? (
        <>
          <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: `${template.barcodeHeightPx + 8}px` }} />
          <div style={{ fontSize: template.baseFontPx - 3, fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 1 }}>
            {code}
          </div>
        </>
      ) : (
        <svg ref={svgRef} style={{ maxWidth: "100%" }} />
      )}
      {serialLine && (
        <div
          style={{
            fontSize: template.baseFontPx - 2,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            lineHeight: 1.05,
            maxWidth: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {serialLabel}: {serialLine}
        </div>
      )}
      {showPrice && (
        <div style={{ fontSize: template.baseFontPx + 1, fontWeight: 700, lineHeight: 1.1 }}>
          {formatCurrency(product.price, locale)}
        </div>
      )}
    </div>
  );
}
