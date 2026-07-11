/**
 * Typed fetch wrapper for the accounts API.
 */
import { apiFetch } from "./fetch";
import type { FinancialAccount, LedgerTransaction } from "@/features/accounts/types";

const BASE = "/api/accounts";

export const accountsApi = {
  list(): Promise<FinancialAccount[]> {
    return apiFetch<FinancialAccount[]>(BASE);
  },

  getById(id: string): Promise<FinancialAccount | null> {
    return apiFetch<FinancialAccount | null>(`${BASE}/${id}`);
  },

  listLedger(accountId?: string): Promise<LedgerTransaction[]> {
    const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return apiFetch<LedgerTransaction[]>(`${BASE}/ledger${qs}`);
  },

  create(data: Record<string, unknown>): Promise<FinancialAccount> {
    return apiFetch<FinancialAccount>(BASE, { method: "POST", body: JSON.stringify(data) });
  },

  update(id: string, patch: Partial<FinancialAccount>): Promise<FinancialAccount | null> {
    return apiFetch<FinancialAccount | null>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  archive(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },

  setDefault(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}/default`, { method: "POST" });
  },

  transfer(input: { fromAccountId: string; toAccountId: string; amount: number; note?: string }): Promise<void> {
    return apiFetch<void>(`${BASE}/transfer`, { method: "POST", body: JSON.stringify(input) });
  },

  depositOrWithdraw(input: { accountId: string; direction: "in" | "out"; amount: number; note?: string }): Promise<void> {
    return apiFetch<void>(`${BASE}/deposit`, { method: "POST", body: JSON.stringify(input) });
  },
};
