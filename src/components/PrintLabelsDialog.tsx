import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Printer, AlertTriangle } from "lucide-react";
import { Product } from "@/shared/lib/types";
import ProductLabel, { LabelSize, LabelTemplate, LABEL_DIMENSIONS } from "./ProductLabel";
import { canPrint, downloadHtml, printHtml } from "@/shared/lib/print";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
}

const MAX_COPIES_PER_PRODUCT = 200;
const MAX_TOTAL_LABELS = 500;

export default function PrintLabelsDialog({ open, onOpenChange, products }: Props) {
  const settings = { shopName: "AmarShop" };
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<LabelSize>("medium");
  const [template, setTemplate] = useState<LabelTemplate>("full");
  const [copies, setCopies] = useState(1);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showShop, setShowShop] = useState(true);

  const copiesNum = Math.max(1, Number(copies) || 1);
  const totalLabels = products.length * copiesNum;
  const perProductOverLimit = copiesNum > MAX_COPIES_PER_PRODUCT;
  const totalOverLimit = totalLabels > MAX_TOTAL_LABELS;
  const hasError = perProductOverLimit || totalOverLimit;

  const expanded = useMemo(() => {
    if (hasError) return [];
    const out: Product[] = [];
    products.forEach((p) => {
      for (let i = 0; i < copiesNum; i++) out.push(p);
    });
    return out;
  }, [products, copiesNum, hasError]);

  const buildThermalLabelHtml = () => {
    const clonedArea = printAreaRef.current?.cloneNode(true) as HTMLElement | undefined;
    if (!clonedArea) return "";
    const dims = LABEL_DIMENSIONS[size];

    return `<!doctype html><html><head><meta charset="utf-8" /><title>Thermal labels</title>
      <style>
        @page { size: ${dims.w} ${dims.h}; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: ${dims.w}; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #labels-print-area, .labels-stack { display: block !important; width: ${dims.w} !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .label-page { display: block !important; width: ${dims.w} !important; height: ${dims.h} !important; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: hidden !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
        .label-page:last-child { page-break-after: auto; break-after: auto; }
        .product-label { border: 0 !important; box-shadow: none !important; }
      </style></head><body>${clonedArea.outerHTML}</body></html>`;
  };

  const handlePrint = () => {
    if (hasError) {
      toast.error("Fix the copy count before printing");
      return;
    }
    if (!canPrint()) {
      toast.error("Printing isn't supported on this device");
      return;
    }
    const html = buildThermalLabelHtml();
    const ok = html ? printHtml(html, "Thermal labels") : false;
    if (!ok) {
      toast.warning("Print window blocked — downloading labels instead");
      if (html) downloadHtml(html, "thermal-labels");
    }
  };

  if (products.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle>Print Product Labels ({products.length})</DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:hidden">
          <div className="space-y-1.5">
            <Label className="text-xs">Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as LabelTemplate)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name-only">Name only</SelectItem>
                <SelectItem value="name-barcode">Name + Barcode</SelectItem>
                <SelectItem value="full">Full (name, barcode, price)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as LabelSize)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (38×25mm)</SelectItem>
                <SelectItem value="medium">Medium (50×30mm)</SelectItem>
                <SelectItem value="large">Large (70×40mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Copies / product</Label>
            <Input
              type="number"
              min={1}
              max={MAX_COPIES_PER_PRODUCT}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
              className={hasError ? "border-destructive" : ""}
            />
          </div>
          {template === "full" && (
            <>
              <div className="flex items-center justify-between rounded-md border px-3">
                <Label className="text-xs">Price</Label>
                <Switch checked={showPrice} onCheckedChange={setShowPrice} />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3">
                <Label className="text-xs">Shop name</Label>
                <Switch checked={showShop} onCheckedChange={setShowShop} />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3">
                <Label className="text-xs">Name</Label>
                <Switch checked={showName} onCheckedChange={setShowName} />
              </div>
            </>
          )}
        </div>

        {hasError && (
          <Alert variant="destructive" className="print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {perProductOverLimit && (
                <div>Copies per product can't exceed {MAX_COPIES_PER_PRODUCT}.</div>
              )}
              {totalOverLimit && (
                <div>
                  Total labels ({totalLabels}) exceeds the limit of {MAX_TOTAL_LABELS}. Reduce copies or
                  selected products.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!hasError && (
          <div className="text-xs text-muted-foreground print:hidden">
            Preview · {totalLabels} label{totalLabels === 1 ? "" : "s"} ({products.length} ×{" "}
            {copiesNum} {copiesNum === 1 ? "copy" : "copies"})
          </div>
        )}

        {/* Print area / preview stack */}
        <div ref={printAreaRef} id="labels-print-area" className="mt-1 rounded-md bg-muted/40 p-3 print:m-0 print:p-0 print:bg-transparent print:rounded-none">
          <div
            className="labels-stack"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "2mm",
            }}
          >
            {expanded.map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                className="label-page"
                style={{ width: LABEL_DIMENSIONS[size].w, height: LABEL_DIMENSIONS[size].h }}
              >
                <ProductLabel
                  product={p}
                  shopName={settings.shopName}
                  size={size}
                  template={template}
                  showName={showName}
                  showPrice={showPrice}
                  showShop={showShop}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={handlePrint}
            disabled={hasError}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4 mr-2" /> Print {expanded.length} labels
          </Button>
        </DialogFooter>

        <style>{`
          @media print {
            @page { size: ${LABEL_DIMENSIONS[size].w} ${LABEL_DIMENSIONS[size].h}; margin: 0; }
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden !important; }
            #labels-print-area, #labels-print-area * { visibility: visible !important; }
            #labels-print-area {
              position: absolute !important; left: 0 !important; top: 0 !important; right: auto !important; bottom: auto !important;
              width: ${LABEL_DIMENSIONS[size].w} !important; padding: 0 !important; margin: 0 !important; background: #fff !important;
              display: block !important;
            }
            #labels-print-area .labels-stack {
              display: block !important;
              width: ${LABEL_DIMENSIONS[size].w} !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #labels-print-area .label-page {
              display: block !important;
              width: ${LABEL_DIMENSIONS[size].w} !important;
              height: ${LABEL_DIMENSIONS[size].h} !important;
              margin: 0 !important;
              padding: 0 !important;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            #labels-print-area .label-page:last-child { page-break-after: auto; break-after: auto; }
            .product-label { border: none !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
