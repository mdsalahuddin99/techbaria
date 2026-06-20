/**
 * Stock Transfer — moves inventory between branches.
 *
 * Until per-branch stock is modeled, transfers act as an auditable
 * movement log: which units left which branch, when they arrived,
 * and which serials/units were involved. Global `Product.stock`
 * is not mutated by transfers (net total unchanged).
 */
export type TransferStatus = "Pending" | "InTransit" | "Received" | "Cancelled";

export interface TransferItem {
  productId: string;
  name: string;
  qty: number;
  /** Optional unit serials moved with this line. */
  serials?: string[];
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  items: TransferItem[];
  status: TransferStatus;
  note?: string;
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  createdBy?: string;
}

export type TransferInput = {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{ productId: string; name: string; qty: number; serials?: string[] }>;
  note?: string;
};
