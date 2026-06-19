/**
 * Typed fetch wrapper for the customers API.
 */
import { apiFetch } from "./fetch";
import type { Customer } from "@/features/customers/types";

const BASE = "/api/customers";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const customersApi = {
  list(search?: string): Promise<PaginatedResponse<Customer>> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<PaginatedResponse<Customer>>(`${BASE}${qs}`);
  },

  getById(id: string): Promise<Customer | null> {
    return apiFetch<Customer | null>(`${BASE}/${id}`);
  },

  create(data: Partial<Customer>): Promise<Customer> {
    return apiFetch<Customer>(BASE, { method: "POST", body: JSON.stringify(data) });
  },

  update(id: string, data: Partial<Customer>): Promise<Customer> {
    return apiFetch<Customer>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },

  withDues(): Promise<Customer[]> {
    return apiFetch<Customer[]>(`${BASE}/dues`);
  },

  // ─── Ledger API ───────────────────────────────────────────────────────

  getLedger(customerId: string, page = 1, pageSize = 20): Promise<{
    entries: Array<{
      id: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      reference: string | null;
      notes: string | null;
      saleId: string | null;
      accountId: string | null;
      createdById: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    return apiFetch(`${BASE}/${customerId}/ledger?page=${page}&pageSize=${pageSize}`);
  },

  getBalance(customerId: string): Promise<{
    id: string;
    name: string;
    phone: string | null;
    balance: number;
    due: number;
    creditLimit: number;
    notes: string | null;
    availableCredit: number;
    isOverLimit: boolean;
  }> {
    return apiFetch(`${BASE}/${customerId}/balance`);
  },

  collectPayment(customerId: string, data: { amount: number; accountId: string; reference?: string; notes?: string }): Promise<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
  }> {
    return apiFetch(`${BASE}/${customerId}/collect`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  depositAdvance(customerId: string, data: { amount: number; accountId: string; reference?: string; notes?: string }): Promise<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
  }> {
    return apiFetch(`${BASE}/${customerId}/deposit-advance`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  withdrawPayment(customerId: string, data: { amount: number; accountId: string; reference?: string; notes?: string }): Promise<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
  }> {
    return apiFetch(`${BASE}/${customerId}/withdraw`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
