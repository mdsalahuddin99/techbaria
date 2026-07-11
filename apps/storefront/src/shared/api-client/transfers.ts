/**
 * Typed fetch wrapper for the transfers API.
 */
import { apiFetch } from "./fetch";
import type { StockTransfer as Transfer } from "@/features/transfers/types";

const BASE = "/api/transfers";

export const transfersApi = {
  list(): Promise<Transfer[]> {
    return apiFetch<Transfer[]>(BASE);
  },

  getById(id: string): Promise<Transfer | null> {
    return apiFetch<Transfer | null>(`${BASE}/${id}`);
  },

  create(data: Partial<Transfer>): Promise<Transfer> {
    return apiFetch<Transfer>(BASE, { method: "POST", body: JSON.stringify(data) });
  },

  dispatch(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}/dispatch`, { method: "POST" });
  },

  receive(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}/receive`, { method: "POST" });
  },

  cancel(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}/cancel`, { method: "POST" });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },
};
