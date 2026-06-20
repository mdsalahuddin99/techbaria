import "server-only";
import crypto from "crypto";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import type { StockAudit, AuditLine, AuditCreateInput } from "@/features/audit/types";

// ─── In-memory store for draft audits ───────────────────────────────────────
// Audits are a counting workflow (Draft → count → Complete/Cancel).
// Completed audits post StockAdjustment records; draft data lives in-memory.
// This can be upgraded to a DB table when the audit volume justifies it.

const auditsByShop = new Map<string, StockAudit[]>();

function getAudits(shopId: string): StockAudit[] {
  if (!auditsByShop.has(shopId)) auditsByShop.set(shopId, []);
  return auditsByShop.get(shopId)!;
}

function nextAuditNumber(shopId: string): string {
  const existing = getAudits(shopId);
  return `AUD-${String(existing.length + 1).padStart(4, "0")}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildAuditLines(
  ctx: Ctx,
  categoryFilter?: string | null,
): Promise<AuditLine[]> {
  const where: Record<string, unknown> = {};
  if (categoryFilter) where.categoryId = categoryFilter;

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      cost: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku ?? undefined,
    category: (p as any).category?.name,
    systemQty: p.stock,
    countedQty: null,
    costPrice: Number(p.cost),
  }));
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const auditService = {
  list(ctx: Ctx): Promise<StockAudit[]> {
    return Promise.resolve(getAudits("default"));
  },

  getById(ctx: Ctx, id: string): Promise<StockAudit | null> {
    const audit = getAudits("default").find((a) => a.id === id) ?? null;
    return Promise.resolve(audit);
  },

  async create(ctx: Ctx, input: AuditCreateInput): Promise<StockAudit> {
    const lines = await buildAuditLines(ctx, input.categoryFilter);
    const id = `audit-${crypto.randomUUID().slice(0, 8)}`;

    const audit: StockAudit = {
      id,
      auditNumber: nextAuditNumber("default"),
      warehouseId: input.warehouseId,
      warehouseName: "", // Resolve from DB if needed
      categoryFilter: input.categoryFilter ?? null,
      status: "Draft",
      lines,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId,
      note: input.note,
    };

    getAudits("default").push(audit);
    return audit;
  },

  async setCount(
    ctx: Ctx,
    auditId: string,
    productId: string,
    countedQty: number | null,
    note?: string,
  ): Promise<void> {
    const audits = getAudits("default");
    const audit = audits.find((a) => a.id === auditId);
    if (!audit) throw new Error(`Audit ${auditId} not found`);
    if (audit.status !== "Draft") throw new Error("Audit is not in Draft state");

    const line = audit.lines.find((l) => l.productId === productId);
    if (line) {
      line.countedQty = countedQty;
      if (note !== undefined) line.note = note;
    }
  },

  async complete(ctx: Ctx, auditId: string): Promise<StockAudit> {
    const audits = getAudits("default");
    const audit = audits.find((a) => a.id === auditId);
    if (!audit) throw new Error(`Audit ${auditId} not found`);
    if (audit.status !== "Draft") throw new Error("Audit is not in Draft state");

    // Post adjustments for lines where countedQty differs from systemQty
    await prisma.$transaction(async (tx) => {
      for (const line of audit.lines) {
        if (line.countedQty == null) continue;
        const variance = line.countedQty - line.systemQty;
        if (variance === 0) continue;

        await tx.stockAdjustment.create({
          data: {
            productId: line.productId,
            warehouseId: audit.warehouseId ?? undefined,
            qtyDelta: variance,
            reason: "CORRECTION",
            notes: `Stock audit ${audit.auditNumber}: ${line.note ?? ""}`.trim(),
            userId: ctx.userId,
          },
        });

        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: variance } },
        });
      }

      // Log audit completion
      await tx.auditLog.create({
        data: {
          userId: ctx.userId,
          entity: "StockAudit",
          entityId: auditId,
          action: "COMPLETE",
          diff: {
            auditNumber: audit.auditNumber,
            totalLines: audit.lines.length,
            countedLines: audit.lines.filter((l) => l.countedQty != null).length,
          },
        },
      });
    });

    audit.status = "Completed";
    audit.completedAt = new Date().toISOString();
    return audit;
  },

  async cancel(ctx: Ctx, auditId: string): Promise<void> {
    const audits = getAudits("default");
    const audit = audits.find((a) => a.id === auditId);
    if (!audit) throw new Error(`Audit ${auditId} not found`);
    if (audit.status !== "Draft") throw new Error("Audit is not in Draft state");

    audit.status = "Cancelled";
    audit.cancelledAt = new Date().toISOString();
  },

  async remove(ctx: Ctx, auditId: string): Promise<void> {
    const audits = getAudits("default");
    const idx = audits.findIndex((a) => a.id === auditId);
    if (idx === -1) throw new Error(`Audit ${auditId} not found`);
    audits.splice(idx, 1);
  },
};
