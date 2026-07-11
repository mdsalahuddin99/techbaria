export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  discount?: number;
  /** Warranty in months attached at sale time. Defaults from product.warrantyMonths. */
  warrantyMonths?: number;
  /** Serial/IMEI numbers captured during POS checkout. */
  serials?: string[];
}

export type PaymentMethod = "Cash" | "Card" | "Mobile Banking" | "Due" | "Wallet";

/** One tender line in a (potentially split) payment. */
export interface SalePayment {
  method: PaymentMethod;
  amount: number;
  /** Account that received this tender (resolved at checkout). */
  accountId?: string | null;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string | null;
  customerName: string;
  customerPhone?: string;
  customerReferencePerson?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  vat?: number;
  extraCharges?: number;
  salesPerson?: string;
  destination?: string;
  attention?: string;
  notes?: string;
  /** Primary method (first tender) — kept for backward compatibility. */
  paymentMethod: PaymentMethod;
  /** Sum of all tendered amounts (may exceed total when cash change is given). */
  amountPaid: number;
  change: number;
  cashier: string;
  /** Who last edited this sale, if ever. */
  editedBy: string | null;
  /** When this sale was last edited, if ever. */
  editedAt: string | null;
  /** Multi-tender breakdown. Single-method sales also populate this. */
  payments?: SalePayment[];
}


export type RefundMethod = "Cash" | "Card" | "Mobile Banking" | "Store Credit";

export interface ReturnItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  restock: boolean;
}

export interface SaleReturn {
  id: string;
  returnNo: string;
  saleId: string;
  invoiceNo: string;
  customerId: string | null;
  customerName: string;
  date: string;
  items: ReturnItem[];
  subtotal: number;
  refundAmount: number;
  restockingFee: number;
  refundMethod: RefundMethod;
  /** Account the cash actually went out from (omitted for Store Credit). */
  refundAccountId?: string;
  reason: string;
  note?: string;
  cashier: string;
}
