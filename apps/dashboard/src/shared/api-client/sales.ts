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
  collectSaleDueAction,
  bulkCollectSaleDueAction,
} from "@/server/actions/sales";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const salesApi = {
  list(filter?: any, params?: { cursor?: string; limit?: number }): Promise<PaginatedResponse<Sale>> {
    return listSalesAction(filter, params) as unknown as Promise<PaginatedResponse<Sale>>;
  },

  getById(id: string): Promise<Sale | null> {
    return getSaleByIdAction(id) as unknown as Promise<Sale | null>;
  },

  byCustomer(customerId: string): Promise<Sale[]> {
    return getSalesByCustomerAction(customerId) as unknown as Promise<Sale[]>;
  },

  async create(input: Record<string, unknown>): Promise<Sale> {
    const res = await createSaleAction(input) as any;
    if (res && res.__error) throw new Error(res.__error);
    return res.data as Sale;
  },

  void(saleId: string, reason: string): Promise<void> {
    return voidSaleAction(saleId, reason) as unknown as Promise<void>;
  },

  async refund(input: {
    saleId: string;
    items: Array<{ productId: string; qty: number; restock: boolean }>;
    refundMethod: string;
    restockingFee?: number;
    reason: string;
    note?: string;
  }): Promise<SaleReturn> {
    const res = await refundSaleAction(input.saleId, input) as any;
    if (res && res.__error) throw new Error(res.__error);
    return res.data as SaleReturn;
  },

  async exchange(id: string, payload: Record<string, unknown>): Promise<Sale> {
    const res = await fetch(`/api/sales/${id}/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Failed to process exchange");
    }
    const json = await res.json();
    return json.data as Sale;
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

  async update(id: string, input: Record<string, unknown>): Promise<Sale> {
    const res = await updateSaleAction(id, input) as any;
    if (res && res.__error) throw new Error(res.__error);
    return res.data as Sale;
  },

  collectDue(id: string, input: { amount: number; accountId: string; type: string; notes?: string }): Promise<Sale> {
    return collectSaleDueAction(id, input) as unknown as Promise<Sale>;
  },

  bulkCollectDue(input: { customerId: string; amount: number; accountId: string; type: string; notes?: string }): Promise<any> {
    return bulkCollectSaleDueAction(input) as unknown as Promise<any>;
  },
};
