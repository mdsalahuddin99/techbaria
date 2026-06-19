import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import type { Product } from "@/shared/lib/types";
import { formatCurrency, productDisplayName } from "@/shared/lib/format";

export type LabelSize = "small" | "medium" | "large";

export type LabelTemplate = "name-only" | "name-barcode" | "full";

export const LABEL_DIMENSIONS: Record<LabelSize, { w: string; h: string; barcodeH: number; fontSize: number }> = {
  small: { w: "38mm", h: "25mm", barcodeH: 28, fontSize: 9 },
  medium: { w: "50mm", h: "30mm", barcodeH: 36, fontSize: 11 },
  large: { w: "70mm", h: "40mm", barcodeH: 48, fontSize: 13 },
};

interface Props {
  product: Product;
  shopName?: string;
  size?: LabelSize;
  template?: LabelTemplate;
  showName?: boolean;
  showPrice?: boolean;
  showShop?: boolean;
}

export default function ProductLabel({
  product,
  shopName,
  size = "medium",
  template = "full",
  showName = true,
  showPrice = true,
  showShop = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dims = LABEL_DIMENSIONS[size];

  // Template overrides
  const renderName = template === "name-only" ? true : template === "name-barcode" ? true : showName;
  const renderBarcode = template !== "name-only";
  const renderPrice = template === "full" ? showPrice : false;
  const renderShop = template === "full" ? showShop : false;

  useEffect(() => {
    if (!svgRef.current || !product.barcode) return;
    if (!renderBarcode) return;
    try {
      JsBarcode(svgRef.current, product.barcode, {
        format: /^\d{13}$/.test(product.barcode) ? "EAN13" : "CODE128",
        width: 1.4,
        height: dims.barcodeH,
        displayValue: true,
        fontSize: dims.fontSize,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // Invalid for chosen format — fall back to CODE128
      try {
        JsBarcode(svgRef.current, product.barcode || product.sku, {
          format: "CODE128",
          width: 1.4,
          height: dims.barcodeH,
          displayValue: true,
          fontSize: dims.fontSize,
          margin: 0,
        });
      } catch {
        /* ignore */
      }
    }
  }, [product.barcode, product.sku, dims.barcodeH, dims.fontSize]);

  return (
    <div
      className="product-label"
      style={{
        width: dims.w,
        height: dims.h,
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
        border: "1px dashed #d4d4d4",
      }}
    >
      {renderShop && shopName && (
        <div style={{ fontSize: dims.fontSize - 2, fontWeight: 600, lineHeight: 1.1 }}>{shopName}</div>
      )}
      {renderName && (
        <div
          style={{
            fontSize: template === "name-only" ? dims.fontSize + 4 : dims.fontSize,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: "100%",
            whiteSpace: template === "name-only" ? "normal" : "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {productDisplayName(product)}
        </div>
      )}
      {renderBarcode && <svg ref={svgRef} style={{ maxWidth: "100%" }} />}
      {renderPrice && (
        <div style={{ fontSize: dims.fontSize + 1, fontWeight: 700, lineHeight: 1.1 }}>
          {formatCurrency(product.price)}
        </div>
      )}
    </div>
  );
}
