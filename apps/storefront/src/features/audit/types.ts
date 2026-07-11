/**
 * Stock Audit — physical count vs system reconciliation.
 *
 * Workflow: Draft (counting) → Completed (variances posted as
 * stock adjustments) or Cancelled. Audits are scoped to a branch
 * + optional category filter so large catalogs can be split.
 */
export type AuditStatus = "Draft" | "Completed" | "Cancelled";

export interface AuditLine {
  productId: string;
  productName: string;
  sku?: string;
  category?: string;
  systemQty: number;
  countedQty: number | null;
  costPrice: number;
  /** Reason captured per-line when variance != 0. */
  note?: string;
}

export interface StockAudit {
  id: string;
  auditNumber: string;
  warehouseId: string | null;
  warehouseName: string;
  categoryFilter?: string | null;
  status: AuditStatus;
  lines: AuditLine[];
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  createdBy?: string;
  note?: string;
}

export interface AuditCreateInput {
  warehouseId: string | null;
  categoryFilter?: string | null;
  note?: string;
}
