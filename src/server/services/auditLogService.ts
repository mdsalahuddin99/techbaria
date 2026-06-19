import "server-only";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { Prisma } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  shopId: string;
  userId: string | null;
  entity: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  diff: Record<string, unknown> | null;
  createdAt: Date;
  userName?: string | null;
}

export interface AuditLogFilter {
  entity?: string;
  entityId?: string;
  action?: "CREATE" | "UPDATE" | "DELETE";
  limit?: number;
  offset?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const auditLogService = {
  /** List audit log entries with optional filters */
  async list(ctx: Ctx, filter?: AuditLogFilter): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = { shopId: ctx.shopId };

    if (filter?.entity) where.entity = filter.entity;
    if (filter?.entityId) where.entityId = filter.entityId;
    if (filter?.action) where.action = filter.action;

    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const entries: AuditLogEntry[] = rows.map((r) => ({
      id: r.id,
      shopId: r.shopId,
      userId: r.userId,
      entity: r.entity,
      entityId: r.entityId,
      action: r.action as "CREATE" | "UPDATE" | "DELETE",
      diff: r.diff as Record<string, unknown> | null,
      createdAt: r.createdAt,
      userName: null,
    }));

    return { entries, total };
  },

  /** Create an audit log entry (called by other services internally) */
  async log(
    ctx: Pick<Ctx, "shopId" | "userId">,
    data: {
      entity: string;
      entityId: string;
      action: "CREATE" | "UPDATE" | "DELETE";
      diff?: Record<string, unknown> | null;
    },
  ) {
    return prisma.auditLog.create({
      data: {
        shopId: ctx.shopId,
        userId: ctx.userId ?? null,
        entity: data.entity,
        entityId: data.entityId,
        action: data.action,
        diff: (data.diff ?? null) as Prisma.InputJsonValue,
      },
    });
  },
};
