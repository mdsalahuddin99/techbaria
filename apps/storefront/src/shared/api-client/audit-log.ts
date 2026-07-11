/**
 * API client wrapper for Audit Log operations.
 */
import { apiFetch } from "./fetch";

const BASE = "/api/audit/log";

export interface AuditLogEntry {
  id: string;
  shopId: string;
  userId: string | null;
  entity: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  diff: Record<string, unknown> | null;
  createdAt: string;
  userName: string | null;
}

export interface AuditLogListResult {
  entries: AuditLogEntry[];
  total: number;
}

export interface AuditLogFilter {
  entity?: string;
  entityId?: string;
  action?: "CREATE" | "UPDATE" | "DELETE";
  limit?: number;
  offset?: number;
}

export const auditLogService = {
  /** List audit log entries with optional filters */
  list(filter?: AuditLogFilter): Promise<AuditLogListResult> {
    const params = new URLSearchParams();
    if (filter?.entity) params.set("entity", filter.entity);
    if (filter?.entityId) params.set("entityId", filter.entityId);
    if (filter?.action) params.set("action", filter.action);
    if (filter?.limit) params.set("limit", String(filter.limit));
    if (filter?.offset) params.set("offset", String(filter.offset));
    const qs = params.toString();
    return apiFetch<AuditLogListResult>(`${BASE}${qs ? `?${qs}` : ""}`);
  },
};
