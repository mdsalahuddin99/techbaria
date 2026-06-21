/**
 * Typed client using Next.js Server Actions.
 */
import type { Sale, SaleReturn } from "@/features/sales/types";
import {
  listSalesAction,
  getSaleByIdAction,
  getSalesByCustomerAction,
  createSaleAction,
  voidSaleAction,
  refundSaleAction,
  updateSaleAction,
  deleteSaleAction,
  deleteReturnAction,
} from "@/server/actions/sales";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const salesApi = {
  list(channel?: string, customerId?: string): Promise<PaginatedResponse<Sale>> {
    return listSalesAction(channel as any, customerId) as unknown as Promise<PaginatedResponse<Sale>>;
  },

  getById(id: string): Promise<Sale | null> {
    return getSaleByIdAction(id) as unknown as Promise<Sale | null>;
  },

  byCustomer(customerId: string): Promise<Sale[]> {
    return getSalesByCustomerAction(customerId) as unknown as Promise<Sale[]>;
  },

  create(input: Record<string, unknown>): Promise<Sale> {
    return createSaleAction(input) as unknown as Promise<Sale>;
  },

  void(saleId: string, reason: string): Promise<void> {
    return voidSaleAction(saleId, reason) as unknown as Promise<void>;
  },

  refund(input: {
    saleId: string;
    items: Array<{ productId: string; qty: number; restock: boolean }>;
    refundMethod: string;
    restockingFee?: number;
    reason: string;
    note?: string;
  }): Promise<SaleReturn> {
    return refundSaleAction(input.saleId, input) as unknown as Promise<SaleReturn>;
  },

  listReturns(): Promise<SaleReturn[]> {
    // Returns are currently embedded in sales data
    return this.list().then((res) =>
      res.items.filter((s) => s.status === "REFUNDED" || s.status === "VOIDED") as unknown as SaleReturn[],
    );
  },

  deleteReturn(id: string): Promise<void> {
    return deleteReturnAction(id).then(() => undefined);
  },

  remove(id: string): Promise<void> {
    return deleteSaleAction(id).then(() => undefined);
  },

  update(id: string, input: Record<string, unknown>): Promise<Sale> {
    return updateSaleAction(id, input) as unknown as Promise<Sale>;
  },
};
