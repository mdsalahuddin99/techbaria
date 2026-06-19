import type { PaymentMethod } from "@/features/sales/types";

export type PurchaseStatus = "Draft" | "Ordered" | "Received" | "Partial";

export interface PurchasePayment {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  /** Optional financial account the cash actually came from. */
  accountId?: string;
  note?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  receivedQty: number;
  costPrice: number;
  /** Extra per-unit cost (freight, duty, etc.). */
  extraCost?: number;
  /** Sale price the shop will use for this unit (optional). */
  salePrice?: number;
  /**
   * Per-unit scanned serials/barcodes for serialized inventory.
   * When present, `qty` should equal `serials.length` and the units
   * become `ProductUnit`s on the product on save.
   */
  serials?: string[];
  /** Warranty start date for the units in this line. */
  warrantyStartDate?: string;
  /** Warranty period in months. */
  warrantyMonths?: number;
  /** Default discount to persist on the product for future sales. */
  defaultDiscount?: { mode: "amount" | "percent"; value: number };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  amountPaid: number;
  status: PurchaseStatus;
  expectedDate?: string;
  createdAt: string;
  receivedAt?: string;
  note?: string;
  /** History of every payment made against this PO. */
  payments?: PurchasePayment[];
}

export type RestockStatus = "Draft" | "Confirmed";

export interface RestockItem {
  productId: string;
  name: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  costPrice: number;
}

export interface RestockOrder {
  id: string;
  roNumber: string;
  items: RestockItem[];
  status: RestockStatus;
  createdAt: string;
  confirmedAt?: string;
  note?: string;
}
