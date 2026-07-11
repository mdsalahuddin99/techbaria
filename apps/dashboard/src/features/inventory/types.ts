export type AdjustmentType = "Add" | "Remove" | "Set";

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: AdjustmentType;
  qty: number;
  beforeStock: number;
  afterStock: number;
  reason: string;
  reference?: string;
  note?: string;
  user: string;
  date: string;
}
