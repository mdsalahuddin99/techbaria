export interface PurchaseCreateInput {
  supplierId?: string;
  warehouseId?: string;
  invoiceNo?: string;
  status?: string;
  discount?: number;
  notes?: string;
  expectedDate?: string;
  items: Array<{
    productId: string;
    name?: string;
    qty: number;
    cost: number;
    extraCost?: number;
    salePrice?: number;
    serials?: string[];
    warrantyStartDate?: string;
    warrantyMonths?: number;
  }>;
  tenders?: Array<{
    type: string;
    amount: number;
    accountId?: string;
    ref?: string;
  }>;
}

/** Same shape as Create, used by update(). */
export type PurchaseUpdateInput = PurchaseCreateInput;
