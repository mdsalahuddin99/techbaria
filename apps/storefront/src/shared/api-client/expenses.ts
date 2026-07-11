/**
 * Typed fetch wrapper for the expenses API.
 */
import { apiFetch } from "./fetch";
import type { Expense } from "@/features/expenses/types";

const BASE = "/api/expenses";

export const expensesApi = {
  list(): Promise<Expense[]> {
    return apiFetch<Expense[]>(BASE);
  },

  getById(id: string): Promise<Expense | null> {
    return apiFetch<Expense | null>(`${BASE}/${id}`);
  },

  create(data: Partial<Expense>): Promise<Expense> {
    return apiFetch<Expense>(BASE, { method: "POST", body: JSON.stringify(data) });
  },

  update(id: string, data: Partial<Expense>): Promise<Expense> {
    return apiFetch<Expense>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },
};
