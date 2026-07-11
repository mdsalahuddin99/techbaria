"use client";

import { useState, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Printer, Download, X } from "lucide-react";
import { ScaledIframe } from "@/components/ScaledIframe";
import { canPrint, printHtml, downloadHtml } from "@/shared/lib/print";
import { toast } from "sonner";
import type { ShopSettings } from "@/features/settings/types";

/** The held-sale shape returned by the API. */
export interface HeldSaleForPrint {
  id: string;
  customerName?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    email?: string;
    referencePerson?: string;
  } | null;
  cart: Array<{
    id: string;
    productId: string;
    name: string;
    qty: number;
    price: number;
    discount?: number;
    serials: string[];
    warrantyMonths?: number;
  }>;
  discount: number;
  salesPerson?: string;
  notes?: string;


  heldAt: string;
  cashier?: string;
}

interface DraftInvoicePreviewProps {
  draft: HeldSaleForPrint | null;
  settings: ShopSettings;
  open: boolean;
  onClose: () => void;
}

/**
 * Quotation / Draft Invoice preview & print dialog.
 * Reuses the same A4 layout as the real Invoice but adds a "DRAFT" watermark
 * and titles it "Quotation".
 */
export function DraftInvoicePreview({
  draft,
  settings,
  open,
  onClose,
}: DraftInvoicePreviewProps) {
  const isDownloading = useRef(false);

  if (!draft) return null;

  const html = buildDraftInvoiceHtml(draft, settings);

  const handlePrint = () => {
    if (!canPrint()) {
      toast.error("Printing isn't supported on this device", {
        description: "Downloading the quotation as an HTML file instead.",
      });
      downloadHtml(html, `Quotation-${draft.id.slice(-6)}`);
      return;
    }
    const ok = printHtml(html, `Quotation-${draft.id.slice(-6)}`);
    if (!ok) {
      toast.warning("Print window blocked", {
        description: "We've downloaded the quotation instead — open it to print.",
      });
      downloadHtml(html, `Quotation-${draft.id.slice(-6)}`);
    }
  };

  const handleDownload = async () => {
    if (isDownloading.current) return;
    isDownloading.current = true;
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.innerHTML = html;
    document.body.appendChild(host);
    const node = host.querySelector(".page") as HTMLElement | null;
    
    // Ensure all images are loaded before capturing
    const images = Array.from(host.querySelectorAll("img"));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    // Fix dimensions and styles to prevent second blank page spill
    if (node) {
      node.style.margin = "0";
      node.style.boxShadow = "none";
      node.style.height = "29.6cm";
      node.style.minHeight = "29.6cm";
      node.style.overflow = "hidden";
      node.style.transform = "none";
      node.setAttribute('data-pdf-mode', 'true');
    }

    try {
      const mod = await import("html2pdf.js");
      const html2pdf = (mod as { default: unknown }).default as (
        el: HTMLElement
      ) => { set: (opts: Record<string, unknown>) => { save: () => Promise<void> } };
      await html2pdf(node ?? host)
        .set({
          margin: 0,
          filename: `Quotation-${draft.id.slice(-6)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        })
        .save();
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("Could not generate PDF — downloading HTML instead");
      downloadHtml(html, `Quotation-${draft.id.slice(-6)}`);
    } finally {
      host.remove();
      isDownloading.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 overflow-hidden gap-0 w-[calc(100vw-1rem)] sm:w-full sm:max-w-4xl max-h-[95vh]">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-b bg-muted/40 print:hidden">
          <DialogTitle className="font-semibold text-sm sm:text-base truncate m-0">
            Quotation — {draft.customerName || draft.customer?.name || "Customer"}
          </DialogTitle>
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
        <div className="max-h-[85vh] overflow-y-auto bg-muted/30 p-2 sm:p-4">
          <ScaledIframe html={html} title="Quotation Preview" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Build HTML ─────────────────────────────────────────────────────────────────

function buildDraftInvoiceHtml(
  draft: HeldSaleForPrint,
  settings: ShopSettings,
): string {
  const cust = draft.customer;
  const customerName = cust?.name || draft.customerName || "";
  const customerPhone = cust?.phone || "";
  const customerAddress = cust?.address || "";
  const customerEmail = cust?.email || "";
  const customerReferencePerson = cust?.referencePerson || "";

  // destination/attention are now proper DB columns, with cart fallback for legacy drafts
  const cartMeta = (draft.cart as any[]).find((r: any) => r._meta);
  const cartItems = (draft.cart as any[]).filter((r: any) => !r._meta);
  const draftDestination = (draft as any).destination || cartMeta?.destination || "";
  const draftAttention = (draft as any).attention || cartMeta?.attention || customerReferencePerson;

  const d = new Date(draft.heldAt);
  const dateStr = d.toLocaleDateString("en-GB");
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const printNow = new Date();
  const printStr = `${printNow.toLocaleDateString("en-GB")}  ${printNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;

  const subtotal = round2(
    cartItems.reduce((s: number, r: any) => s + r.price * r.qty - (r.discount || 0), 0)
  );
  const total = round2(Math.max(0, subtotal));
  const totalQty = cartItems.reduce((s: number, i: any) => s + i.qty, 0);
  const words = numberToWords(total) + " Only";
  const totalDiscount = round2(cartItems.reduce((s: number, r: any) => s + (r.discount || 0), 0));

  const warrantyLabel = (m?: number) => {
    if (!m || m <= 0) return "<span style='font-size:8.5px;color:#555;line-height:1.4;'>NO<br/>WARRANTY</span>";
    return `<span style='font-size:9px;font-weight:700;'>${m} MONTH${m > 1 ? "S" : ""}</span>`;
  };

  const itemRows = cartItems.map((i: any, idx: number) => {
    const serialStr = i.serials?.length
      ? `<div style="font-size:8px;color:#555;margin-top:2px;padding-left:2px;">S/N: ${esc(i.serials.join(", "))}</div>`
      : "";
    const rowBg = idx % 2 === 1 ? "#f9f9f9" : "#ffffff";
    return `<tr style="border-bottom:1px solid #ccc;background:${rowBg};">
      <td style="border-right:1px solid #ccc;padding:5px 4px;text-align:center;vertical-align:middle;">${idx + 1}</td>
      <td style="border-right:1px solid #ccc;padding:5px 7px;vertical-align:top;">
        <div style="font-weight:600;line-height:1.3;">${esc(i.name)}</div>${serialStr}
      </td>
      <td style="border-right:1px solid #ccc;padding:5px 4px;text-align:center;vertical-align:middle;line-height:1.3;">${warrantyLabel(i.warrantyMonths)}</td>
      <td style="border-right:1px solid #ccc;padding:5px 4px;text-align:center;vertical-align:middle;">${i.qty.toFixed(2)}</td>
      <td style="border-right:1px solid #ccc;padding:5px 4px;text-align:center;vertical-align:middle;">PCS</td>
      <td style="border-right:1px solid #ccc;padding:5px 7px;text-align:right;vertical-align:middle;">${i.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="padding:5px 7px;text-align:right;vertical-align:middle;font-weight:600;">${(i.price * i.qty).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`;
  }).join("");

  // Footer brand logos
  const footerLogos = settings.invoiceFooterBrandLogos?.length
    ? `<div style="display:flex;justify-content:center;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:9px;">
        ${settings.invoiceFooterBrandLogos.map(url => `<img src="${url}" style="height:26px;" />`).join("")}
       </div>`
    : "";

  // Header
  const headerHtml = settings.invoiceFullHeaderUrl
    ? `<div style="width:100%;text-align:center;margin-bottom:14px;">
         <img src="${settings.invoiceFullHeaderUrl}" style="max-width:100%;" />
       </div>`
    : `<table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:125px;vertical-align:middle;text-align:left;padding-right:8px;">
            ${settings.logoUrl
              ? `<img src="${settings.logoUrl}" style="max-width:115px;max-height:80px;" />`
              : `<div style="width:90px;height:70px;background:#f0f0f0;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;text-align:center;">LOGO</div>`}
          </td>
          <td style="vertical-align:middle;text-align:center;padding:0 6px;">
            <div style="font-size:26px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;letter-spacing:0.4px;line-height:1.1;color:#111;">${esc(settings.shopName)}</div>
            ${settings.tagline ? `<div style="font-size:10px;font-weight:700;margin-top:3px;color:#333;letter-spacing:0.2px;">${esc(settings.tagline)}</div>` : ""}
            <div style="font-size:10px;margin-top:4px;color:#333;line-height:1.5;">${esc(settings.address)}</div>
            <div style="font-size:10.5px;font-weight:700;margin-top:4px;color:#111;">
              <svg style="width:10px;height:10px;display:inline-block;vertical-align:middle;margin-right:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 4h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              ${esc(settings.phone)}
            </div>
            <div style="font-size:9.5px;margin-top:3px;color:#444;display:flex;align-items:center;justify-content:center;gap:14px;">
              ${settings.email ? `<span>&#9993;&nbsp;${esc(settings.email)}</span>` : ""}
              ${settings.website ? `<span>&#127760;&nbsp;${esc(settings.website)}</span>` : ""}
            </div>
          </td>
          <td style="width:125px;vertical-align:middle;text-align:right;padding-left:8px;">
            ${settings.invoiceHeaderRightLogoUrl
              ? `<img src="${settings.invoiceHeaderRightLogoUrl}" style="max-width:115px;max-height:80px;" />`
              : ""}
          </td>
        </tr>
      </table>
      <div style="border-top:2.5px solid #111;margin:10px 0 12px;"></div>`;

  const footerHtml = settings.invoiceFullFooterUrl
    ? `<div style="width:100%;text-align:center;margin-bottom:8px;"><img src="${settings.invoiceFullFooterUrl}" style="max-width:100%;" /></div>`
    : footerLogos + (settings.invoiceShowComputerGenerated === false ? "" : `<div style="text-align:center;font-size:10.5px;font-weight:700;letter-spacing:1px;margin-bottom:9px;color:#333;">Computer Generated Quotation, No Sign Required</div>`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Quotation — ${esc(settings.shopName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  @page { size:A4 portrait; margin:0; }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  html,body {
    background:#dde0e5;
    color:#111;
    font-family:'Inter',Arial,Helvetica,sans-serif;
    font-size:10.5px;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  .page {
    width:21cm;
    min-height:29.7cm;
    margin:16px auto;
    background:#fff;
    padding:1.15cm 1.25cm 2.3cm 1.25cm;
    position:relative;
    box-shadow:0 6px 32px rgba(0,0,0,0.15);
    overflow:hidden;
  }
  table { border-collapse:collapse; width:100%; }
  
  /* DRAFT watermark */
  .draft-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 140px;
    font-weight: 900;
    color: rgba(200, 0, 0, 0.06);
    letter-spacing: 20px;
    pointer-events: none;
    z-index: 0;
    user-select: none;
    white-space: nowrap;
  }
  .page > *:not(.draft-watermark) {
    position: relative;
    z-index: 1;
  }

  @media print {
    html,body { background:#fff; }
    .page { margin:0; width:21cm; min-height:29.7cm; padding:1.15cm 1.25cm 2.3cm 1.25cm; box-shadow:none; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- DRAFT Watermark -->
  <div class="draft-watermark">DRAFT</div>

  <!-- HEADER -->
  ${headerHtml}

  <!-- TITLE -->
  <div style="text-align:center;margin-bottom:13px;">
    <span style="border:1.5px solid #111;padding:3px 24px;font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;display:inline-block;">
      Quotation
    </span>
  </div>

  <!-- CUSTOMER + INVOICE INFO -->
  <table style="margin-bottom:11px;font-size:10.5px;border:1px solid #888;">
    <tr>
      <td style="width:62%;vertical-align:top;border-right:1px solid #888;padding:7px 10px;">
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="font-weight:700;width:88px;padding:2.5px 0;vertical-align:top;">Customer</td><td style="padding:2.5px 0;font-weight:700;vertical-align:top;">: ${esc(customerName || "—")}</td></tr>
          <tr><td style="font-weight:600;padding:2px 0;vertical-align:top;">Address</td><td style="padding:2px 0;vertical-align:top;">: ${esc(customerAddress || "")}</td></tr>
          <tr><td style="font-weight:600;padding:2px 0;vertical-align:top;">Mobile</td><td style="padding:2px 0;vertical-align:top;">: ${esc(customerPhone || "")}</td></tr>
          <tr><td style="font-weight:600;padding:2px 0;vertical-align:top;">Attention</td><td style="padding:2px 0;vertical-align:top;">: ${esc(draftAttention || "")}</td></tr>
          <tr><td style="font-weight:600;padding:2px 0;vertical-align:top;">Destination</td><td style="padding:2px 0;vertical-align:top;">: ${esc(draftDestination || "")}</td></tr>
        </table>
      </td>
      <td style="width:38%;vertical-align:top;padding:0;">
        <table style="border-collapse:collapse;width:100%;height:100%;">
          <tr style="border-bottom:1px solid #888;"><td style="padding:4px 8px;font-weight:700;width:102px;background:#f5f5f5;border-right:1px solid #888;">Ref No.</td><td style="padding:4px 8px;font-weight:700;">${esc(draft.id.slice(-8).toUpperCase())}</td></tr>
          <tr style="border-bottom:1px solid #888;"><td style="padding:4px 8px;font-weight:700;background:#f5f5f5;border-right:1px solid #888;">Date</td><td style="padding:4px 8px;font-weight:600;">${esc(dateStr)}</td></tr>
          <tr style="border-bottom:1px solid #888;"><td style="padding:4px 8px;font-weight:700;background:#f5f5f5;border-right:1px solid #888;">Entry Time</td><td style="padding:4px 8px;">${esc(timeStr)}</td></tr>
          <tr style="border-bottom:1px solid #888;"><td style="padding:4px 8px;font-weight:700;background:#f5f5f5;border-right:1px solid #888;">Prepared By</td><td style="padding:4px 8px;">${esc(draft.cashier || "—")}</td></tr>
          <tr style="border-bottom:1px solid #888;"><td style="padding:4px 8px;font-weight:700;background:#f5f5f5;border-right:1px solid #888;">Sales Person</td><td style="padding:4px 8px;">${esc(draft.salesPerson || "—")}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:700;background:#f5f5f5;border-right:1px solid #888;">Status</td><td style="padding:4px 8px;font-weight:700;color:#ca8a04;">QUOTATION</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table style="border:1px solid #888;font-size:10.5px;margin-bottom:11px;">
    <thead>
      <tr style="background:#efefef;border-bottom:1.5px solid #666;">
        <th style="border-right:1px solid #888;padding:6px 4px;text-align:center;width:30px;font-weight:700;">SL</th>
        <th style="border-right:1px solid #888;padding:6px 8px;text-align:left;font-weight:700;">Product Description</th>
        <th style="border-right:1px solid #888;padding:6px 4px;text-align:center;width:70px;font-weight:700;">Warranty</th>
        <th style="border-right:1px solid #888;padding:6px 4px;text-align:center;width:46px;font-weight:700;">Qty</th>
        <th style="border-right:1px solid #888;padding:6px 4px;text-align:center;width:44px;font-weight:700;">UoM</th>
        <th style="border-right:1px solid #888;padding:6px 8px;text-align:right;width:82px;font-weight:700;">Unit Price</th>
        <th style="padding:6px 8px;text-align:right;width:92px;font-weight:700;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- BOTTOM SECTION -->
  <table style="border:1px solid #888;font-size:10.5px;margin-bottom:13px;">
    <tr>
      <td style="width:54%;vertical-align:top;border-right:1px solid #888;padding:8px 10px;">
        <div style="border:1.5px solid #555;display:inline-block;padding:3px 12px;font-weight:700;font-size:11px;margin-bottom:8px;">
          Total Qty :&nbsp;&nbsp;&nbsp; ${totalQty.toFixed(2)}
        </div>
        <div style="margin-bottom:7px;"><span style="font-weight:700;">Take In Word : </span><span>${esc(words)}</span></div>
        <div style="margin-bottom:10px;"><span style="font-weight:700;">Narration : </span><span>${esc(draft.notes || "")}</span></div>
        <div style="font-weight:700;margin-bottom:4px;">Terms &amp; Conditions :</div>
        <div style="font-size:9.5px;color:#333;line-height:1.65;">
          - This quotation is valid for 7 days from the date of issue.<br/>
          - Prices are subject to change without prior notice.<br/>
          - Payment terms as per agreement.
        </div>
      </td>
      <td style="width:46%;vertical-align:top;padding:0;">
        <table style="border-collapse:collapse;width:100%;font-size:10.5px;">
          <tr style="border-bottom:1px solid #ccc;"><td style="padding:5px 10px;font-weight:600;background:#f5f5f5;border-right:1px solid #ccc;">Total Amount</td><td style="padding:5px 10px;text-align:right;font-weight:600;">${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
          <tr style="border-bottom:1px solid #ccc;"><td style="padding:5px 10px;font-weight:600;background:#f5f5f5;border-right:1px solid #ccc;">Less Discount</td><td style="padding:5px 10px;text-align:right;">${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>


          <tr style="background:#efefef;"><td style="padding:6px 10px;font-weight:700;font-size:11px;border-right:1px solid #ccc;">Net Payable Amount</td><td style="padding:6px 10px;text-align:right;font-weight:700;font-size:11px;">${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div style="position:absolute;bottom:1.15cm;left:1.25cm;right:1.25cm;">
    ${footerHtml}
    <div style="display:flex;justify-content:space-between;font-size:9px;border-top:1px solid #aaa;padding-top:5px;color:#555;font-weight:600;">
      <span>Print Date &amp; Time : ${esc(printStr)}</span>
      <span>Page 1 of 1</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

