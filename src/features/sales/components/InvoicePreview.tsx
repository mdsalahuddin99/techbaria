"use client";

import dynamic from "next/dynamic";
const Invoice = dynamic(() => import("@/components/Invoice"), { ssr: false });
const ThermalReceipt = dynamic(() => import("@/components/ThermalReceipt"), { ssr: false });
import ReceiptChooser from "@/components/ReceiptChooser";
import type { Sale } from "@/shared/lib/types";
import type { ShopSettings } from "@/features/settings/types";

export type ReceiptView = "chooser" | "thermal" | "invoice" | null;

interface InvoicePreviewProps {
  sale: Sale | null;
  settings: ShopSettings;
  view: ReceiptView;
  onClose: () => void;
  onPickThermal: () => void;
  onPickInvoice: () => void;
}

/**
 * Receipt flow wrapper: chooser → thermal/invoice. Keeps POS screen
 * free of receipt presentation logic.
 */
export function InvoicePreview({
  sale,
  settings,
  view,
  onClose,
  onPickThermal,
  onPickInvoice,
}: InvoicePreviewProps) {
  return (
    <>
      <ReceiptChooser
        open={!!sale && view === "chooser"}
        onClose={onClose}
        onPickThermal={onPickThermal}
        onPickInvoice={onPickInvoice}
      />
      <ThermalReceipt
        sale={sale}
        settings={settings}
        open={!!sale && view === "thermal"}
        onClose={onClose}
      />
      <Invoice
        sale={sale}
        settings={settings}
        open={!!sale && view === "invoice"}
        onClose={onClose}
      />
    </>
  );
}
