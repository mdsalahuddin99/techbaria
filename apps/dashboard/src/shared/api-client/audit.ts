/**
 * API client wrapper for Audit (stock-count) operations.
 */
import { apiFetch } from "./fetch";
import type { StockAudit, AuditCreateInput } from "@/features/audit/types";

const BASE = "/api/audit";

export const auditService = {
  list(): Promise<StockAudit[]> {
    return apiFetch<StockAudit[]>(BASE);
  },

  getById(id: string): Promise<StockAudit | null> {
    return apiFetch<StockAudit | null>(`${BASE}/${id}`);
  },

  create(input: AuditCreateInput): Promise<StockAudit> {
    return apiFetch<StockAudit>(BASE, { method: "POST", body: JSON.stringify(input) });
  },

  setCount(auditId: string, productId: string, countedQty: number | null, note?: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${auditId}/count`, {
      method: "POST",
      body: JSON.stringify({ productId, countedQty, note }),
    });
  },

  complete(auditId: string): Promise<StockAudit> {
    return apiFetch<StockAudit>(`${BASE}/${auditId}/complete`, { method: "POST" });
  },

  cancel(auditId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${auditId}/cancel`, { method: "POST" });
  },

  remove(auditId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${auditId}`, { method: "DELETE" });
  },
};
