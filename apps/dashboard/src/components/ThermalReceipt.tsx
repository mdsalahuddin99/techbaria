import { Sale, ShopSettings } from "@/shared/lib/types";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Printer, X, Download } from "lucide-react";
import { useState } from "react";
import { canPrint, printHtml, downloadHtml } from "@/shared/lib/print";
import { toast } from "sonner";

type Width = "58mm" | "80mm";

interface Props {
  sale: Sale | null;
  settings: ShopSettings;
  open: boolean;
  onClose: () => void;
}

export default function ThermalReceipt({ sale, settings, open, onClose }: Props) {
  const [width, setWidth] = useState<Width>("80mm");
  if (!sale) return null;

  const buildHtml = () => {
    const node = document.getElementById("thermal-receipt-printable");
    const inner = node?.innerHTML ?? "";
    return `<!doctype html><html><head><meta charset="utf-8" /><title>${sale.invoiceNo}</title>
      <style>
        @page { size: ${width} auto; margin: 0; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Courier New', ui-monospace, monospace; color: #000;
               width: ${width}; padding: 4mm; font-size: 11px; line-height: 1.35; }
        .center { text-align: center; }
        .right { text-align: right; }
        .row { display: flex; justify-content: space-between; gap: 6px; }
        .bold { font-weight: 700; }
        .lg { font-size: 13px; }
        .xl { font-size: 15px; font-weight: 700; }
        .sep { border-top: 1px dashed #000; margin: 4px 0; }
        .double { border-top: 2px solid #000; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1px 0; vertical-align: top; }
        th { text-align: left; border-bottom: 1px dashed #000; font-size: 10px; }
        td.num, th.num { text-align: right; }
      </style></head><body>${inner}</body></html>`;
  };

  const handlePrint = () => {
    if (!canPrint()) {
      toast.error("Printing isn't supported on this device", {
        description: "Downloading the receipt as an HTML file instead.",
      });
      downloadHtml(buildHtml(), `${sale.invoiceNo}-thermal`);
      return;
    }
    const ok = printHtml(buildHtml(), sale.invoiceNo);
    if (!ok) {
      toast.warning("Print window blocked", {
        description: "We've downloaded the receipt instead — open it to print.",
      });
      downloadHtml(buildHtml(), `${sale.invoiceNo}-thermal`);
    }
  };

  const handleDownload = () => downloadHtml(buildHtml(), `${sale.invoiceNo}-thermal`);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
          <DialogTitle className="font-semibold text-sm m-0">Thermal Receipt</DialogTitle>
          <div className="flex items-center gap-2">
            <Select value={width} onValueChange={(v) => setWidth(v as Width)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="80mm">80mm</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleDownload} title="Download HTML">
              <Download className="h-4 w-4 mr-1.5" /> Save
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 p-4 max-h-[70vh] overflow-y-auto">
          <div
            id="thermal-receipt-printable"
            className="bg-card text-black mx-auto shadow-sm"
            style={{
              width,
              padding: "4mm",
              fontFamily: "'Courier New', ui-monospace, monospace",
              fontSize: "11px",
              lineHeight: 1.35,
            }}
          >
            <div className="center">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.shopName}
                  style={{ maxHeight: 48, maxWidth: "60%", margin: "0 auto 4px", display: "block" }}
                />
              )}
              <div className="xl">{settings.shopName}</div>
              {settings.tagline && <div style={{ fontSize: 10 }}>{settings.tagline}</div>}
              <div>{settings.address}</div>
              <div>{settings.phone}</div>
              
            </div>
            <div className="double" />
            <div className="row"><span>Invoice:</span><span className="bold">{sale.invoiceNo}</span></div>
            <div className="row"><span>Date:</span><span>{formatDateTime(sale.date)}</span></div>
            <div className="row"><span>Cashier:</span><span>{sale.cashier}</span></div>
            <div className="row"><span>Customer:</span><span>{sale.customerName}</span></div>
            <div className="sep" />
            <table>
              <thead>
                <tr><th>Item</th><th className="num">Qty</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.productId}>
                    <td>
                      {i.name}
                      <div style={{ fontSize: 10, opacity: 0.75 }}>{formatCurrency(i.price)} ea</div>
                      {(i.warrantyMonths ?? 0) > 0 && (
                        <div style={{ fontSize: 10, opacity: 0.85 }}>
                          🛡 Warranty: {i.warrantyMonths}mo (till {new Date(new Date(sale.date).setMonth(new Date(sale.date).getMonth() + (i.warrantyMonths ?? 0))).toLocaleDateString("en-GB")})
                        </div>
                      )}
                      {i.serials?.length ? (
                        <div style={{ fontSize: 10, opacity: 0.75 }}>
                          SN: {i.serials.join(", ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="num">{i.qty}</td>
                    <td className="num">{formatCurrency(i.price * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sep" />
            <div className="row"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
            {sale.discount > 0 && (
              <div className="row"><span>Discount</span><span>- {formatCurrency(sale.discount)}</span></div>
            )}
            <div className="double" />
            <div className="row lg bold"><span>TOTAL</span><span>{formatCurrency(sale.total)}</span></div>
            <div className="sep" />
            <div className="row"><span>{sale.paymentMethod}</span><span>{formatCurrency(sale.amountPaid)}</span></div>
            <div className="row"><span>Change</span><span>{formatCurrency(sale.change)}</span></div>
            <div className="sep" />
            <div className="center" style={{ marginTop: 6 }}>
              <div className="bold">{settings.receiptFooter}</div>
              <div style={{ fontSize: 10, marginTop: 4 }}>** Thank you, please come again **</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
