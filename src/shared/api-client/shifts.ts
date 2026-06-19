/**
 * Typed fetch wrapper for the shifts API.
 */
import { apiFetch } from "./fetch";

interface CashShift {
  id: string;
  shopId: string;
  userId: string;
  openingBalance: number;
  closingBalance?: number;
  closingCount?: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string;
}

const BASE = "/api/shifts";

export const shiftsApi = {
  list(): Promise<CashShift[]> {
    return apiFetch<CashShift[]>(BASE);
  },

  getById(id: string): Promise<CashShift | null> {
    return apiFetch<CashShift | null>(`${BASE}/${id}`);
  },

  active(): Promise<CashShift | null> {
    return apiFetch<CashShift | null>(`${BASE}/active`);
  },

  open(openingBalance: number): Promise<CashShift> {
    return apiFetch<CashShift>(BASE, { method: "POST", body: JSON.stringify({ openingBalance }) });
  },

  close(closingCount: number): Promise<void> {
    return apiFetch<void>(`${BASE}/close`, { method: "POST", body: JSON.stringify({ closingCount }) });
  },

  expectedCash(): Promise<number> {
    return apiFetch<{ expectedCash: number }>(`${BASE}/expected-cash`).then((r) => r.expectedCash);
  },
};
