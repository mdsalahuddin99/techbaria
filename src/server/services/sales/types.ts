import type { StorefrontOrderCreateInput, StorefrontOrderStatus } from "./storefrontOrder";

export interface SaleCreateInput {
  customerId?: string;
  channel?: "POS" | "STOREFRONT";
  warehouseId?: string;
  discount?: number;
  notes?: string;
  salesPerson?: string;
  date?: string;
  destination?: string;
  attention?: string;
  vat?: number;
  extraCharges?: number;

  items: Array<{
    productId: string;
    name?: string;
    qty: number;
    price: number;
    discount?: number;
    warrantyMonths?: number;
    serials?: string[];
  }>;
  tenders: Array<{
    type: string;
    amount: number;
    accountId?: string;
    ref?: string;
  }>;
}

/** Same shape as Create, used by update(). */
export type SaleUpdateInput = SaleCreateInput;

export interface SaleListFilter {
  channel?: "POS" | "STOREFRONT";
  customerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  paymentMethod?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}

export interface RefundInput {
  items: Array<{
    productId: string;
    qty: number;
    restock: boolean;
  }>;
  reason: string;
  notes?: string;
}

export type { StorefrontOrderCreateInput, StorefrontOrderStatus };
