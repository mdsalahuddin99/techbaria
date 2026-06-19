/**
 * Typed fetch wrapper for the inventory API.
 */
import { apiFetch } from "./fetch";
import type { StockAdjustment } from "@/features/inventory/types";

const BASE = "/api/inventory";

export const inventoryApi = {
  snapshot(): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(BASE);
  },

  lowStock(): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`${BASE}/low-stock`);
  },

  outOfStock(): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`${BASE}/out-of-stock`);
  },

  warehouseStock(warehouseId: string): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`${BASE}/branch-stock?warehouseId=${encodeURIComponent(warehouseId)}`);
  },

  listAdjustments(): Promise<StockAdjustment[]> {
    return apiFetch<StockAdjustment[]>(`${BASE}/adjustments`);
  },

  adjust(input: {
    productId: string;
    qtyDelta: number;
    reason: string;
    notes?: string;
    branchId?: string;
    warehouseId?: string;
  }): Promise<void> {
    return apiFetch<void>(`${BASE}/adjust`, { method: "POST", body: JSON.stringify(input) });
  },
};
