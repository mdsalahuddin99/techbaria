"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { canPrint, printHtml } from "@/shared/lib/print";
import { toast } from "sonner";
import { formatDateTime } from "@/shared/lib/format";
import type { WarrantyClaim } from "@/shared/api-client/warrantyClaims";
import { useSettings } from "@/features/settings/hooks";
import type { ShopSettings } from "@/features/settings/types";

function esc(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWarrantyChallanHtml(claim: WarrantyClaim, settings: ShopSettings): string {
  const printNow = new Date();
  const printStr = `${printNow.toLocaleDateString("en-GB")} ${printNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  
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
            ${settings.address ? `<div style="font-size:11.5px;margin-top:5px;color:#333;font-weight:500;line-height:1.4;">${esc(settings.address)}</div>` : ""}
            ${settings.phone ? `<div style="font-size:11.5px;margin-top:2px;color:#333;font-weight:500;">Phone: ${esc(settings.phone)}</div>` : ""}
          </td>
          <td style="width:125px;vertical-align:middle;text-align:right;"></td>
        </tr>
      </table>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Warranty Challan - ${claim.claimNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; color: #000; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 14mm; background: #fff; position: relative; }
    @media print {
      body { background: none; }
      .page { width: 100%; min-height: auto; margin: 0; padding: 0; box-shadow: none; border: none; }
      @page { size: A4 portrait; margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${headerHtml}
    
    <div style="text-align:center;margin:15px 0;">
      <div style="display:inline-block;border:2px solid #222;border-radius:4px;padding:4px 16px;font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">
        WARRANTY CHALLAN
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:12px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:15px;">
          <div style="border:1px solid #ccc;border-radius:4px;padding:10px;min-height:90px;">
            <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:4px;text-transform:uppercase;">To Supplier</div>
            <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:2px;">${esc(claim.supplier?.name || "N/A")}</div>
            ${claim.type === "CUSTOMER_CLAIM" && claim.customer ? `<div style="margin-top:8px;font-size:11px;color:#555;">From Customer: <span style="color:#111;font-weight:600;">${esc(claim.customer.name)}</span> ${claim.customer.phone ? `(${esc(claim.customer.phone)})` : ""}</div>` : ""}
            ${claim.type === "DEFECTIVE_STOCK" ? `<div style="margin-top:8px;font-size:11px;font-weight:600;color:#111;">DEFECTIVE STOCK RETURN</div>` : ""}
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:15px;">
          <div style="border:1px solid #ccc;border-radius:4px;padding:10px;min-height:90px;background:#f9f9f9;">
            <table style="width:100%;font-size:12px;">
              <tr><td style="padding-bottom:5px;color:#555;width:90px;">Challan No:</td><td style="padding-bottom:5px;font-weight:700;font-size:13px;">${esc(claim.claimNo)}</td></tr>
              <tr><td style="padding-bottom:5px;color:#555;">Date:</td><td style="padding-bottom:5px;font-weight:600;">${formatDateTime(claim.createdAt)}</td></tr>
              ${claim.sale ? `<tr><td style="padding-bottom:5px;color:#555;">Invoice No:</td><td style="padding-bottom:5px;font-weight:600;">${esc(claim.sale.invoiceNo)}</td></tr>` : ""}
            </table>
          </div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;border:1px solid #000;font-size:12px;margin-bottom:20px;">
      <thead>
        <tr style="background:#222;color:#fff;text-align:left;">
          <th style="padding:8px;border:1px solid #000;width:40px;text-align:center;">SL</th>
          <th style="padding:8px;border:1px solid #000;">Product Details</th>
          <th style="padding:8px;border:1px solid #000;width:150px;">Serial / IMEI</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:10px 8px;border:1px solid #000;text-align:center;vertical-align:top;">1</td>
          <td style="padding:10px 8px;border:1px solid #000;vertical-align:top;">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${esc(claim.product?.name)}</div>
          </td>
          <td style="padding:10px 8px;border:1px solid #000;vertical-align:top;font-family:monospace;font-size:13px;">
            ${esc(claim.serialNumber || "N/A")}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="border:1px solid #000;padding:12px;margin-bottom:30px;min-height:100px;">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;text-transform:uppercase;color:#333;">Issue Description / Problem:</div>
      <div style="font-size:13px;line-height:1.5;">${esc(claim.issueDescription || "No description provided.")}</div>
    </div>
    
    <div style="display:flex;justify-content:space-between;margin-top:60px;padding:0 20px;">
      <div style="text-align:center;">
        <div style="border-top:1px solid #000;width:160px;padding-top:6px;font-size:12px;font-weight:600;">Authorized Signatory</div>
      </div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #000;width:160px;padding-top:6px;font-size:12px;font-weight:600;">Supplier / Receiver Sign</div>
      </div>
    </div>
    
    <div style="position:absolute;bottom:15mm;left:14mm;right:14mm;text-align:center;font-size:9.5px;color:#777;border-top:1px solid #eee;padding-top:8px;">
      Printed on ${printStr} by ${esc(settings.shopName)} POS System
    </div>
  </div>
</body>
</html>
  `;
}

export function PrintChallanButton({ claim, iconOnly }: { claim: WarrantyClaim; iconOnly?: boolean }) {
  const settings = useSettings();

  const handlePrint = () => {
    if (!settings) {
      toast.error("Settings not loaded yet.");
      return;
    }
    const html = buildWarrantyChallanHtml(claim, settings);
    if (!canPrint()) {
      toast.error("Printing is not supported on this device.");
      return;
    }
    printHtml(html, `Challan-${claim.claimNo}`);
  };

  if (iconOnly) {
    return (
      <Button variant="ghost" size="icon" onClick={handlePrint} title="Print Challan">
        <Printer className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={handlePrint} className="mr-2">
      <Printer className="h-4 w-4 mr-2" />
      Print Challan
    </Button>
  );
}
