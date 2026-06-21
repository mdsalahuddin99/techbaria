"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { Printer, Download, X } from "lucide-react";
import { canPrint, printHtml, downloadHtml } from "@/shared/lib/print";
import { toast } from "sonner";

interface PurchaseInvoiceDialogProps {
  receipt: any | null;
  onClose: () => void;
  suppliers: any[];
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  userEmail: string;
  settings: any;
}

export function PurchaseInvoiceDialog({
  receipt, onClose, suppliers, shopName, shopAddress, shopPhone, userEmail, settings
}: PurchaseInvoiceDialogProps) {
  if (!receipt) return null;

  const supplier = suppliers.find((s: any) => s.id === receipt.supplierId);
  const activeSettings = settings || {};

  const handleDownload = async () => {
    const html = buildStandalonePurchaseInvoice(receipt, activeSettings, supplier, userEmail);
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.innerHTML = html;
    document.body.appendChild(host);
    const node = host.querySelector(".page") as HTMLElement | null;
    try {
      const mod = await import("html2pdf.js");
      const html2pdf = (mod as { default: unknown }).default as (
        el: HTMLElement
      ) => { set: (opts: Record<string, unknown>) => { save: () => Promise<void> } };
      await html2pdf(node ?? host)
        .set({
          margin: 0,
          filename: `${receipt.poNumber}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        })
        .save();
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("Could not generate PDF — downloading HTML instead");
      downloadHtml(html, receipt.poNumber);
    } finally {
      host.remove();
    }
  };

  const handlePrint = () => {
    const html = buildStandalonePurchaseInvoice(receipt, activeSettings, supplier, userEmail);
    if (!canPrint()) {
      toast.error("Printing isn't supported on this device", {
        description: "Downloading the invoice as an HTML file instead.",
      });
      downloadHtml(html, receipt.poNumber);
      return;
    }
    const ok = printHtml(html, receipt.poNumber);
    if (!ok) {
      toast.warning("Print window blocked", {
        description: "We've downloaded the invoice instead — open it to print.",
      });
      downloadHtml(html, receipt.poNumber);
    }
  };

  const html = buildStandalonePurchaseInvoice(receipt, activeSettings, supplier, userEmail);

  return (
    <Dialog open={!!receipt} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 overflow-hidden gap-0 w-[calc(100vw-1rem)] sm:w-full sm:max-w-4xl max-h-[95vh]">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-b bg-muted/40 print:hidden">
          <DialogTitle className="font-semibold text-sm sm:text-base truncate m-0">Purchase Invoice {receipt.poNumber}</DialogTitle>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={handleDownload} className="h-8 px-2 sm:px-3">
              <Download className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-2 sm:px-3"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Print</span>
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="max-h-[85vh] overflow-y-auto bg-muted/30">
          <iframe
            title={`Purchase Invoice ${receipt.poNumber}`}
            srcDoc={html}
            className="w-full bg-card"
            style={{ height: "80vh", border: 0 }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function esc(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function numberToWords(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const under1000 = (x: number): string => {
    let s = "";
    if (x >= 100) {
      s += a[Math.floor(x / 100)] + " Hundred";
      x %= 100;
      if (x) s += " ";
    }
    if (x >= 20) {
      s += b[Math.floor(x / 10)];
      if (x % 10) s += " " + a[x % 10];
    } else if (x > 0) {
      s += a[x];
    }
    return s;
  };
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(under1000(crore) + " Crore");
  if (lakh) parts.push(under1000(lakh) + " Lakh");
  if (thousand) parts.push(under1000(thousand) + " Thousand");
  if (rest) parts.push(under1000(rest));
  return parts.join(" ").trim();
}

function buildStandalonePurchaseInvoice(receipt: any, settings: any, supplier: any, userEmail: string): string {
  const d = new Date(receipt.createdAt);
  const dateStr = d.toLocaleDateString("en-GB");
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const printNow = new Date();
  const printStr = `${printNow.toLocaleDateString("en-GB")}  ${printNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  
  const total = Math.max(0, receipt.subtotal - receipt.discount);
  const due = Math.max(0, total - receipt.amountPaid);
  
  const billStatus = receipt.amountPaid >= total ? "Paid" : receipt.amountPaid > 0 ? "Partial" : "Due";
  const billStatusColor = receipt.amountPaid >= total ? "#16a34a" : receipt.amountPaid > 0 ? "#f59e0b" : "#dc2626";
  const totalQty = receipt.items.reduce((s: number, i: any) => s + i.qty, 0);
  const words = numberToWords(total) + " Only";

  const warrantyLabel = (m?: number) => {
    if (!m || m <= 0) return "NO WARRANTY";
    return `${m} MONTH${m > 1 ? "S" : ""}`;
  };

  const itemRows = receipt.items
    .map((i: any, idx: number) => {
      const serialStr = i.serials?.length
        ? `<div style="font-size:9px; color:#444; font-weight:normal; margin-left:12px; margin-top:2px;">S/N: ${esc(i.serials.join(", "))}</div>`
        : "";
      return `
        <tr style="border-bottom:1px solid #000;">
          <td style="border-right:1px solid #000; padding:4px; text-align:center; vertical-align:middle;">${idx + 1}</td>
          <td style="border-right:1px solid #000; padding:4px; vertical-align:top; text-align:left;">
            <div style="font-weight:bold;">${esc(i.name)}</div>
            ${serialStr}
          </td>
          <td style="border-right:1px solid #000; padding:4px; text-align:center; vertical-align:middle; white-space:pre-wrap;">${warrantyLabel(i.warrantyMonths).replace(" ", "\n")}</td>
          <td style="border-right:1px solid #000; padding:4px; text-align:center; vertical-align:middle;">${i.qty.toFixed(2)}</td>
          <td style="border-right:1px solid #000; padding:4px; text-align:center; vertical-align:middle;">PCS</td>
          <td style="border-right:1px solid #000; padding:4px; text-align:right; vertical-align:middle;">${i.costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding:4px; text-align:right; vertical-align:middle;">${(i.costPrice * i.qty).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
    })
    .join("");

  const shopName = settings.shopName || "My Shop";
  const shopAddress = settings.address || "";
  const shopPhone = settings.phone || "";
  const shopEmail = settings.email || "";
  const shopWebsite = settings.website || "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(receipt.poNumber)} — ${esc(shopName)}</title>
<style>
  @page { margin: 0; }
  *,*::before,*::after { box-sizing: border-box; }
  html,body { margin:0; padding:0; background:#eef0f3; color:#000; font-family: Arial, Helvetica, sans-serif; font-size:11px; }
  .page { 
    width: 21cm; 
    min-height: 29.7cm; /* A4 height */
    margin: 16px auto; 
    background:#fff; 
    padding: 1.50cm 1.50cm 2.00cm 1.50cm; /* Adjusted margins for exact printing */
    position: relative; 
  }
  
  @media screen and (max-width: 22cm) {
    .page {
      width: 100%;
      margin: 0;
      padding: 1.2cm;
    }
  }
  @media screen and (max-width: 480px) {
    .page {
      padding: 0.6cm;
    }
  }
  
  /* Header Layout */
  .hdr-top { display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; }
  .hdr-logo-left { width: 140px; text-align:left; }
  .hdr-center { flex:1; text-align:center; padding: 0 10px; }
  .hdr-logo-right { width: 140px; text-align:right; }
  
  /* Reset table styles */
  table { border-collapse: collapse; }
  td, th { padding: 3px 5px; }
  
  @media print {
    html,body { background:#fff; }
    .page { margin:0; width:21cm; min-height:29.7cm; padding: 1.50cm 1.50cm 2.00cm 1.50cm; box-shadow:none; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>
  <div class="page">
    
    <!-- Top Header Layout -->
    ${settings.invoiceFullHeaderUrl ? 
      `<div style="width:100%; text-align:center; margin-bottom: 12px;">
         <img src="${settings.invoiceFullHeaderUrl}" style="max-width:100%; object-fit:contain;" />
       </div>` : 
      `<div class="hdr-top">
        <div class="hdr-logo-left">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-width:100%; max-height:75px; object-fit:contain;"/>` : ''}
        </div>
        <div class="hdr-center">
          <div style="font-size:28px; font-weight:bold; font-family:'Outfit', Arial, sans-serif; letter-spacing:0.5px; line-height:1.1;">${esc(shopName)}</div>
          ${settings.tagline ? `<div style="font-size:10.5px; font-weight:bold; margin-top:3px; color:#111;">${esc(settings.tagline)}</div>` : ''}
          <div style="font-size:10.5px; margin-top:3px; color:#222;">${esc(shopAddress)}</div>
          <div style="font-size:11px; font-weight:bold; margin-top:4px; display:flex; align-items:center; justify-content:center; gap:3px;">
            <svg style="width:11px; height:11px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${esc(shopPhone)}
          </div>
          <div style="font-size:10px; margin-top:3px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:12px; color:#222;">
            <span style="display:flex; align-items:center; gap:3px;">
              <svg style="width:10px; height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              ${esc(shopEmail)}
            </span>
            <span style="display:flex; align-items:center; gap:3px;">
              <svg style="width:10px; height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              ${esc(shopWebsite)}
            </span>
          </div>
        </div>
        <div class="hdr-logo-right">
          ${settings.invoiceHeaderRightLogoUrl ? `<img src="${settings.invoiceHeaderRightLogoUrl}" style="max-width:100%; max-height:75px; object-fit:contain;"/>` : ''}
        </div>
      </div>`
    }
    
    <!-- Title Box -->
    <div style="text-align:center; margin-bottom: 14px; margin-top: 4px;">
      <span style="border: 1.5px solid #000; padding: 2px 16px; font-weight:bold; font-size:12px; display:inline-block; letter-spacing:1px; text-transform:uppercase;">
        PURCHASE INVOICE
      </span>
    </div>

    <!-- Supplier & Invoice Info Table Grid -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:14px; font-size:11px;">
      <tr>
        <td style="width:65%; vertical-align:top; border:1px solid #000; padding:6px 8px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="width:85px; font-weight:bold; padding:2px 0;">Supplier</td><td style="font-weight:bold; padding:2px 0;">: ${esc(receipt.supplierName)}</td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">Contact</td><td style="padding:2px 0;">: ${esc(supplier?.contactPerson || "")}</td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">Address</td><td style="padding:2px 0;">: ${esc(supplier?.address || "")}</td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">Mobile</td><td style="padding:2px 0;">: ${esc(supplier?.phone || "")}</td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">Attention</td><td style="padding:2px 0;">: </td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">Destination</td><td style="padding:2px 0;">: </td></tr>
          </table>
        </td>
        <td style="width:35%; vertical-align:top; border:1px solid #000; padding:0;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; height:100%;">
            <tr style="border-bottom:1px solid #000;"><td style="padding:3px 6px; font-weight:bold; width:95px;">Invoice No.</td><td style="padding:3px 6px; border-left:1px solid #000; font-weight:bold;">${esc(receipt.poNumber)}</td></tr>
            <tr style="border-bottom:1px solid #000;"><td style="padding:3px 6px; font-weight:bold;">Date</td><td style="padding:3px 6px; border-left:1px solid #000; font-weight:bold;">${esc(dateStr)}</td></tr>
            <tr style="border-bottom:1px solid #000;"><td style="padding:3px 6px; font-weight:bold;">Entry Time</td><td style="padding:3px 6px; border-left:1px solid #000;">${esc(timeStr)}</td></tr>
            <tr style="border-bottom:1px solid #000;"><td style="padding:3px 6px; font-weight:bold;">Prepared By</td><td style="padding:3px 6px; border-left:1px solid #000;">${esc(userEmail || "—")}</td></tr>
            <tr style="border-bottom:1px solid #000;"><td style="padding:3px 6px; font-weight:bold;">Ref. No.</td><td style="padding:3px 6px; border-left:1px solid #000;">${esc(receipt.note || "—")}</td></tr>
            <tr><td style="padding:3px 6px; font-weight:bold;">Bill Status</td><td style="padding:3px 6px; border-left:1px solid #000; font-weight:bold; color:${billStatusColor};">${billStatus.toUpperCase()}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Items Table -->
    <table style="width:100%; border:1px solid #000; border-collapse:collapse; font-size:11px; margin-bottom: 14px;">
      <thead>
        <tr style="border-bottom:1.5px solid #000; background-color:#fafafa;">
          <th style="border-right:1px solid #000; padding:5px; text-align:center; width:35px; font-weight:bold;">SL</th>
          <th style="border-right:1px solid #000; padding:5px; text-align:left; font-weight:bold;">Product Description</th>
          <th style="border-right:1px solid #000; padding:5px; text-align:center; width:80px; font-weight:bold;">Warranty</th>
          <th style="border-right:1px solid #000; padding:5px; text-align:center; width:50px; font-weight:bold;">Qty</th>
          <th style="border-right:1px solid #000; padding:5px; text-align:center; width:50px; font-weight:bold;">UoM</th>
          <th style="border-right:1px solid #000; padding:5px; text-align:right; width:85px; font-weight:bold;">Unit Price</th>
          <th style="padding:5px; text-align:right; width:100px; font-weight:bold;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Bottom Section Layout -->
    <table style="width:100%; border:1px solid #000; border-collapse:collapse; font-size:11px; margin-bottom:12px;">
      <tr>
        <td style="width:55%; vertical-align:top; border-right:1px solid #000; padding:8px 12px;">
          <div style="border:1px solid #000; padding:4px 10px; font-weight:bold; margin-bottom:8px; display:inline-block; font-size:11px;">
            Total Qty : &nbsp;&nbsp;&nbsp;&nbsp; ${totalQty.toFixed(2)}
          </div>
          <div style="font-weight:bold; margin-bottom:8px; font-size:11px;">Taka In Word : <span style="font-weight:normal;">${esc(words)}</span></div>
          <div style="font-weight:bold; margin-bottom:12px; font-size:11px;">Narration : <span style="font-weight:normal;">${esc(receipt.note || "")}</span></div>
          <div style="font-weight:bold; margin-bottom:4px; font-size:11px;">Terms &amp; Conditions :</div>
          <div style="line-height:1.4; font-size:10px; color:#222;">
            ${esc(settings.purchaseTermsPolicy ?? "-Goods received in good condition.\n-Warranty voids if label is broken.\n-Payment must be settled within terms.").replace(/\n/g, "<br/>")}
          </div>
        </td>
        <td style="width:45%; vertical-align:top; padding:0;">
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <tr style="border-bottom:1px solid #000;">
              <td style="padding:4px 8px; font-weight:bold; width:155px;">Total Amount</td>
              <td style="padding:4px 8px; text-align:right; font-weight:bold; border-left:1px solid #000;">${receipt.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr style="border-bottom:1px solid #000;">
              <td style="padding:4px 8px; font-weight:bold;">Less Discount</td>
              <td style="padding:4px 8px; text-align:right; border-left:1px solid #000;">${receipt.discount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr style="border-bottom:1px solid #000; background-color:#fafafa;">
              <td style="padding:5px 8px; font-weight:bold; font-size:11px;">Net Payable Amount</td>
              <td style="padding:5px 8px; text-align:right; font-weight:bold; border-left:1px solid #000; font-size:11px;">${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr style="border-bottom:1px solid #000; background-color:#fafafa; color:#16a34a;">
              <td style="padding:5px 8px; font-weight:bold; font-size:11px;">Paid Amount</td>
              <td style="padding:5px 8px; text-align:right; font-weight:bold; border-left:1px solid #000; font-size:11px;">${receipt.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background-color:#fafafa; color:#dc2626;">
              <td style="padding:5px 8px; font-weight:bold; font-size:11px;">Due Amount</td>
              <td style="padding:5px 8px; text-align:right; font-weight:bold; border-left:1px solid #000; font-size:11px;">${due.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Absolute positioning for Footer to stay at the bottom of the A4 page -->
    <div style="position: absolute; bottom: 1.50cm; left: 1.50cm; right: 1.50cm;">
      ${settings.invoiceFullFooterUrl ? 
        `<div style="width:100%; text-align:center; margin-bottom:8px;">
           <img src="${settings.invoiceFullFooterUrl}" style="max-width:100%; object-fit:contain;" />
         </div>` :
        `${settings.invoiceShowComputerGenerated === false ? "" : `<div style="text-align:center; font-size:11px; font-weight:bold; letter-spacing:1px; margin-bottom:10px; color:#111;">Computer Generated Bill, No Sign Required</div>`}
         
         <div style="text-align:center; margin-bottom:8px; display:flex; justify-content:center; align-items:center; gap:24px; flex-wrap:wrap;">
           ${settings.invoiceFooterBrandLogos?.length 
             ? settings.invoiceFooterBrandLogos.map((url: string) => `<img src="${url}" style="height:25px; object-fit:contain;" />`).join("")
             : `
               <span style="font-weight:bold; font-size:14px; color:#d32f2f; font-style:italic; letter-spacing:0.5px;">HIKVISION</span>
               <span style="font-weight:bold; font-size:14px; letter-spacing:0.5px;">unv</span>
               <span style="font-weight:bold; font-size:14px; color:#f57c00; letter-spacing:0.5px;">IMOU</span>
               <span style="font-weight:bold; font-size:14px; color:#0288d1; letter-spacing:0.5px;">tp-link</span>
               <span style="font-weight:bold; font-size:14px; color:#e65100; font-style:italic; letter-spacing:0.5px;">Tenda</span>
             `}
         </div>`
      }

      <div style="display:flex; justify-content:space-between; font-size:9.5px; border-top:1px solid #000; padding-top:6px; font-weight:bold;">
        <span>Print Date &amp; Time : ${esc(printStr)}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>

  </div>
</body>
</html>`;
}
