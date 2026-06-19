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
        ? `<div style="font-size:10px; color:#555; border-top:1px solid #ccc; padding-top:2px; margin-top:2px;">S/N: ${esc(i.serials.join(", "))}</div>`
        : "";
      return `
        <tr>
          <td style="border:1px solid #000; padding:4px; text-align:center; vertical-align:middle;">${idx + 1}</td>
          <td style="border:1px solid #000; padding:4px; vertical-align:top;">
            <div style="font-weight:600;">${esc(i.name)}</div>
            ${serialStr}
          </td>
          <td style="border:1px solid #000; padding:4px; text-align:center; vertical-align:middle; white-space:pre-wrap;">${warrantyLabel(i.warrantyMonths).replace(" ", "\n")}</td>
          <td style="border:1px solid #000; padding:4px; text-align:center; vertical-align:middle;">${i.qty.toFixed(2)}</td>
          <td style="border:1px solid #000; padding:4px; text-align:center; vertical-align:middle;">PCS</td>
          <td style="border:1px solid #000; padding:4px; text-align:right; vertical-align:middle;">${i.costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="border:1px solid #000; padding:4px; text-align:right; vertical-align:middle;">${(i.costPrice * i.qty).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
  html,body { margin:0; padding:0; background:#eef0f3; color:#000; font-family: Arial, Helvetica, sans-serif; font-size:12px; }
  .page { 
    width: 21cm; 
    min-height: 29.7cm; /* A4 height */
    margin: 16px auto; 
    background:#fff; 
    padding: 2.50cm; /* 2.50 margin all around */
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
  
  /* Header */
  .hdr-top { display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; }
  .hdr-logo-left { width: 150px; text-align:left; }
  .hdr-center { flex:1; text-align:center; }
  .hdr-logo-right { width: 180px; text-align:right; }
  
  /* Reset some paddings */
  table { border-collapse: collapse; }
  td { padding: 2px 4px; }
  
  @media print {
    html,body { background:#fff; }
    .page { margin:0; width:21cm; min-height:29.7cm; padding: 2.50cm; box-shadow:none; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>
  <div class="page">
    
    <!-- Top Header Layout -->
    ${settings.invoiceFullHeaderUrl ? 
      `<div style="width:100%; text-align:center; margin-bottom: 8px;">
         <img src="${settings.invoiceFullHeaderUrl}" style="max-width:100%; object-fit:contain;" />
       </div>` : 
      `<div class="hdr-top">
        <div class="hdr-logo-left">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-width:100%; max-height:80px; object-fit:contain;"/>` : ''}
        </div>
        <div class="hdr-center">
          <div style="font-size:34px; font-weight:bold; letter-spacing:0.5px;">${esc(shopName)}</div>
          ${settings.tagline ? `<div style="font-size:12px; font-weight:600; margin-top:2px;">A Sister Concern Of <span style="font-weight:bold; font-size:13px;">${esc(settings.tagline)}</span></div>` : ''}
          <div style="font-size:12px; margin-top:2px;">${esc(shopAddress)}</div>
          <div style="font-size:12px; font-weight:bold; margin-top:2px;">
            &#9742; ${esc(shopPhone)}
          </div>
          <div style="font-size:11px; margin-top:2px; font-weight:bold;">
            &#9993; ${esc(shopEmail)} &nbsp;&nbsp;&nbsp; &#12710; ${esc(shopWebsite)}
          </div>
        </div>
        <div class="hdr-logo-right">
          ${settings.invoiceHeaderRightLogoUrl ? `<img src="${settings.invoiceHeaderRightLogoUrl}" style="max-width:100%; max-height:80px; object-fit:contain;"/>` : ''}
        </div>
      </div>`
    }
    
    <!-- Title Box -->
    <div style="text-align:center; margin-bottom: 12px; margin-top: 4px;">
      <span style="border: 1.5px solid #000; padding: 2px 16px; font-weight:bold; font-size:13px; display:inline-block;">
        PURCHASE INVOICE
      </span>
    </div>

    <!-- Supplier & Invoice Info Table Grid -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
      <tr>
        <td style="width:65%; vertical-align:top; border:1px solid #000; padding:4px 8px;">
          <table style="width:100%;">
            <tr><td style="width:80px; font-weight:bold;">Supplier</td><td style="font-weight:bold;">: ${esc(receipt.supplierName)}</td></tr>
            <tr><td style="font-weight:bold;">Contact</td><td>: ${esc(supplier?.contactPerson || "—")}</td></tr>
            <tr><td style="font-weight:bold;">Address</td><td>: ${esc(supplier?.address || "—")}</td></tr>
            <tr><td style="font-weight:bold;">Mobile</td><td>: ${esc(supplier?.phone || "—")}</td></tr>
          </table>
        </td>
        <td style="width:35%; vertical-align:top; border:1px solid #000; padding:0;">
          <table style="width:100%; height:100%;">
            <tr><td style="border-bottom:1px solid #000; padding:2px 6px; font-weight:bold; width:90px;">Invoice No.</td><td style="border-bottom:1px solid #000; padding:2px 6px; border-left:1px solid #000; font-weight:bold;">${esc(receipt.poNumber)}</td></tr>
            <tr><td style="border-bottom:1px solid #000; padding:2px 6px; font-weight:bold;">Date</td><td style="border-bottom:1px solid #000; padding:2px 6px; border-left:1px solid #000; font-weight:bold;">${esc(dateStr)}</td></tr>
            <tr><td style="border-bottom:1px solid #000; padding:2px 6px; font-weight:bold;">Entry Time</td><td style="border-bottom:1px solid #000; padding:2px 6px; border-left:1px solid #000;">${esc(timeStr)}</td></tr>
            <tr><td style="border-bottom:1px solid #000; padding:2px 6px; font-weight:bold;">Prepared By</td><td style="border-bottom:1px solid #000; padding:2px 6px; border-left:1px solid #000;">${esc(userEmail || "—")}</td></tr>
            <tr><td style="border-bottom:1px solid #000; padding:2px 6px; font-weight:bold;">Ref. No.</td><td style="border-bottom:1px solid #000; padding:2px 6px; border-left:1px solid #000;">${esc(receipt.note || "—")}</td></tr>
            <tr><td style="padding:2px 6px; font-weight:bold;">Bill Status</td><td style="padding:2px 6px; border-left:1px solid #000; font-weight:bold; color:${billStatusColor};">${billStatus.toUpperCase()}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Items Table -->
    <table style="width:100%; border:1px solid #000; font-size:11px; margin-bottom: 12px;">
      <thead>
        <tr>
          <th style="border:1px solid #000; padding:4px; text-align:center; width:30px">SL</th>
          <th style="border:1px solid #000; padding:4px; text-align:left">Product Description</th>
          <th style="border:1px solid #000; padding:4px; text-align:center; width:70px">Warranty</th>
          <th style="border:1px solid #000; padding:4px; text-align:center; width:45px">Qty</th>
          <th style="border:1px solid #000; padding:4px; text-align:center; width:45px">UoM</th>
          <th style="border:1px solid #000; padding:4px; text-align:right; width:75px">Unit Price</th>
          <th style="border:1px solid #000; padding:4px; text-align:right; width:85px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Bottom Section Layout -->
    <table style="width:100%; border:1px solid #000; font-size:11px;">
      <tr>
        <td style="width:55%; vertical-align:top; padding:8px 12px;">
          <table style="border:1px solid #000; margin-bottom:8px;">
            <tr><td style="padding:2px 8px; font-weight:bold;">Total Qty :</td><td style="padding:2px 8px; font-weight:bold; border-left:1px solid #000;">${totalQty.toFixed(2)}</td></tr>
          </table>
          <div style="font-weight:bold; margin-bottom:12px;">Taka In Word : ${esc(words)}</div>
          <div style="font-weight:bold; margin-bottom:12px;">Narration : ${esc(receipt.note || "")}</div>
          <div style="font-weight:bold; margin-bottom:4px;">Terms &amp; Conditions :</div>
          <div style="line-height:1.4;">
            ${esc(settings.purchaseTermsPolicy ?? "-Goods received in good condition.\n-Warranty voids if label is broken.\n-Payment must be settled within terms.").replace(/\n/g, "<br/>")}
          </div>
        </td>
        <td style="width:45%; vertical-align:top; padding:0;">
          <table style="width:100%; height:100%;">
            <tr>
              <td style="padding:4px 8px; font-weight:bold;">Total Amount</td>
              <td style="padding:4px 8px; text-align:right; font-weight:bold;">${receipt.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px; font-weight:bold;">Less Discount</td>
              <td style="padding:4px 8px; text-align:right;">${receipt.discount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px; font-weight:bold; border-top:1px solid #000; border-bottom:1px solid #000;">Net Payable Amount</td>
              <td style="padding:4px 8px; text-align:right; font-weight:bold; border-top:1px solid #000; border-bottom:1px solid #000;">${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px; font-weight:bold; border-bottom:1px solid #000; color:#16a34a">Paid Amount</td>
              <td style="padding:4px 8px; text-align:right; font-weight:bold; border-bottom:1px solid #000; color:#16a34a">${receipt.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px; font-weight:bold; color:#dc2626">Due Amount</td>
              <td style="padding:4px 8px; text-align:right; font-weight:bold; color:#dc2626">${due.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </td>

      </tr>
    </table>

    <!-- Absolute positioning for Footer to stay at the bottom of the page -->
    <div style="position: absolute; bottom: 2.50cm; left: 2.50cm; right: 2.50cm;">
      ${settings.invoiceFullFooterUrl ? 
        `<div style="width:100%; text-align:center; margin-bottom:8px;">
           <img src="${settings.invoiceFullFooterUrl}" style="max-width:100%; object-fit:contain;" />
         </div>` :
        `${settings.invoiceShowComputerGenerated === false ? "" : `<div style="text-align:center; font-size:12px; font-weight:bold; letter-spacing:2px; margin-bottom:12px; color:#333;">Computer Generated Bill, No Sign Required</div>`}
         
         <div style="text-align:center; margin-bottom:8px; display:flex; justify-content:center; align-items:center; gap:20px; flex-wrap:wrap;">
           ${settings.invoiceFooterBrandLogos?.length 
             ? settings.invoiceFooterBrandLogos.map((url: string) => `<img src="${url}" style="height:30px; object-fit:contain;" />`).join("")
             : `
               <span style="font-weight:bold; font-size:16px; color:#d32f2f; font-style:italic;">HIKVISION</span>
               <span style="font-weight:bold; font-size:16px;">unv</span>
               <span style="font-weight:bold; font-size:16px; color:#f57c00;">IMOU</span>
               <span style="font-weight:bold; font-size:16px; color:#0288d1;">tp-link</span>
               <span style="font-weight:bold; font-size:16px; color:#e65100; font-style:italic;">Tenda</span>
             `}
         </div>`
      }

      <div style="display:flex; justify-content:space-between; font-size:10px; border-top:1px solid #000; padding-top:6px; font-weight:bold;">
        <span>Print Date &amp; Time : ${esc(printStr)}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>

  </div>
</body>
</html>`;
}
