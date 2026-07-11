import { useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Printer, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/shared/lib/types";
import { useUpdateProduct, useProducts } from "@/features/products/hooks";
import { canPrint, downloadHtml, printHtml } from "@/shared/lib/print";
import { generateEan13, isValidEan13 } from "@/shared/lib/barcode";
import { LABEL_TEMPLATES, DEFAULT_TEMPLATE_ID, getTemplate } from "./templates";
import type { LabelScope } from "./types";
import { buildLabelItems } from "./buildLabelItems";
import { ProductLabel, type LabelCodeType } from "./ProductLabel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}

const SCOPE_OPTIONS: { value: LabelScope; label: string; description: string }[] = [
  { value: "in_stock", label: "In-stock units", description: "Stock অনুযায়ী copy / প্রতি in-stock unit-এর জন্য একটি" },
  { value: "all_units", label: "All units", description: "প্রতিটা registered unit (sold সহ)" },
  { value: "one_each", label: "One per product", description: "প্রতি প্রোডাক্টে একটিই label" },
];

export function LabelPrintDialog({ open, onOpenChange, products }: Props) {
  const settings = { shopName: "AmarShop" };
  const updateProductMut = useUpdateProduct();
  const { data: allProducts = [] } = useProducts();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [scope, setScope] = useState<LabelScope>("in_stock");
  const [showShop, setShowShop] = useState(false);
  const [showPrice, setShowPrice] = useState(true);
  const [codeType, setCodeType] = useState<LabelCodeType>("barcode");

  const template = getTemplate(templateId);
  const items = useMemo(() => buildLabelItems(products, scope), [products, scope]);

  const missingBarcodeCount = useMemo(
    () => products.filter((p) => !p.barcode || !isValidEan13(p.barcode)).length,
    [products],
  );

  const handleGenerateMissing = () => {
    const allBarcodes = allProducts.map((p) => p.barcode).filter(Boolean);
    const used = new Set(allBarcodes);
    let count = 0;
    for (const p of products) {
      if (p.barcode && isValidEan13(p.barcode)) continue;
      const code = generateEan13(used);
      used.add(code);
      updateProductMut.mutate({ id: p.id, patch: { barcode: code } });
      count++;
    }
    if (count > 0) toast.success(`${count} barcode generated & saved`);
    else toast.info("সব প্রোডাক্টের valid barcode আছে");
  };

  const buildThermalLabelHtml = () => {
    const clonedArea = printAreaRef.current?.cloneNode(true) as HTMLElement | undefined;
    if (!clonedArea) return "";

    const sourceCanvases = Array.from(printAreaRef.current?.querySelectorAll("canvas") ?? []);
    const clonedCanvases = Array.from(clonedArea.querySelectorAll("canvas"));
    clonedCanvases.forEach((canvas, index) => {
      const image = document.createElement("img");
      image.src = sourceCanvases[index]?.toDataURL("image/png") ?? "";
      image.style.maxWidth = "100%";
      image.style.maxHeight = `${template.barcodeHeightPx + 8}px`;
      canvas.replaceWith(image);
    });

    return `<!doctype html><html><head><meta charset="utf-8" /><title>Thermal labels</title>
      <style>
        @page { size: ${template.widthMm}mm ${template.heightMm}mm; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: ${template.widthMm}mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .label-print-area, .label-stack { display: block !important; width: ${template.widthMm}mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .label-page { display: block !important; width: ${template.widthMm}mm !important; height: ${template.heightMm}mm !important; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: hidden !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
        .label-page:last-child { page-break-after: auto; break-after: auto; }
        .product-label { border: 0 !important; box-shadow: none !important; }
      </style></head><body>${clonedArea.outerHTML}</body></html>`;
  };

  const handlePrint = () => {
    if (!canPrint()) {
      toast.error("এই ডিভাইসে print support নেই");
      return;
    }
    const html = buildThermalLabelHtml();
    const ok = html ? printHtml(html, "Thermal labels") : false;
    if (!ok) {
      toast.warning("Print window blocked — HTML download করা হচ্ছে");
      if (html) downloadHtml(html, "thermal-labels");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:p-0 print:shadow-none print:border-0 print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle>Print Labels</DialogTitle>
          <DialogDescription>
            Thermal printer-এর জন্য exact size-এ প্রিন্ট হবে। A4-এ যাবে না — প্রিন্ট ডায়ালগে আপনার label printer সিলেক্ট করুন।
          </DialogDescription>
        </DialogHeader>

        {/* ---- Controls (hidden in print) ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <div className="space-y-1">
            <Label className="text-xs">Label size</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LABEL_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.description ? ` — ${t.description}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Print scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as LabelScope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} — <span className="text-muted-foreground">{o.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Code type</Label>
            <Select value={codeType} onValueChange={(v) => setCodeType(v as LabelCodeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="barcode">Barcode (EAN-13 / CODE128)</SelectItem>
                <SelectItem value="qr">QR Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-2 rounded-md border sm:col-span-1">
            <Label htmlFor="show-shop" className="text-xs">Shop name দেখাও</Label>
            <Switch id="show-shop" checked={showShop} onCheckedChange={setShowShop} />
          </div>
          <div className="flex items-center justify-between p-2 rounded-md border">
            <Label htmlFor="show-price" className="text-xs">দাম দেখাও</Label>
            <Switch id="show-price" checked={showPrice} onCheckedChange={setShowPrice} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-medium text-foreground">{items.length}</span> label{items.length === 1 ? "" : "s"} · {products.length} product{products.length === 1 ? "" : "s"} · {template.name}
          </div>
          {missingBarcodeCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleGenerateMissing} className="ml-auto">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate {missingBarcodeCount} missing barcode{missingBarcodeCount === 1 ? "" : "s"}
            </Button>
          )}
        </div>

        {items.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-warning/10 text-warning text-sm print:hidden">
            <AlertCircle className="h-4 w-4 shrink-0" />
            এই scope-এ কোনো label নেই। Stock যোগ করুন বা scope পাল্টান।
          </div>
        )}

        {/* ---- Preview / Print canvas ----
             Labels are stacked vertically (one below another) — both on
             screen for preview and on the thermal roll when printed. */}
        <div ref={printAreaRef} className="label-print-area rounded-md bg-muted/40 p-3 print:m-0 print:p-0 print:bg-transparent print:rounded-none">
          <div className="label-stack flex flex-col items-start gap-2 print:gap-0 print:items-stretch">
            {items.map((it) => (
              <div
                key={it.key}
                className="label-page bg-card border border-dashed border-border print:border-0"
                style={{ width: `${template.widthMm}mm`, height: `${template.heightMm}mm` }}
              >
                <ProductLabel
                  product={it.product}
                  unit={it.unit}
                  template={template}
                  shopName={settings?.shopName}
                  showShop={showShop}
                  showPrice={showPrice}
                  codeType={codeType}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print {items.length} label{items.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>

        {/* ---- Print stylesheet ----
             Forces exact thermal size, one label per page, no margins so the
             printer cannot fall back to A4. */}
        <style>{`
          @media print {
            @page { size: ${template.widthMm}mm ${template.heightMm}mm; margin: 0; }
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden !important; }
            .label-print-area, .label-print-area * { visibility: visible !important; }
            .label-print-area {
              position: absolute !important; left: 0 !important; top: 0 !important; right: auto !important; bottom: auto !important;
              width: ${template.widthMm}mm !important;
              padding: 0 !important; margin: 0 !important; background: #fff !important;
              display: block !important;
            }
            .label-stack {
              display: block !important;
              width: ${template.widthMm}mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .label-page {
              display: block !important;
              width: ${template.widthMm}mm !important;
              height: ${template.heightMm}mm !important;
              margin: 0 !important; padding: 0 !important; border: 0 !important;
              page-break-after: always; break-after: page;
              page-break-inside: avoid; break-inside: avoid;
            }
            .label-page:last-child { page-break-after: auto; break-after: auto; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
