import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import type { WarehouseInput } from "@/shared/validators/warehouse";
import { auditLogService } from "./auditLogService";

export const warehousesService = {
  /** List all warehouses. */
  async list(ctx: Ctx) {
    return prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });
  },

  /** Get warehouse by ID. */
  async getById(ctx: Ctx, id: string) {
    const w = await prisma.warehouse.findUnique({
      where: { id },
    });
    if (!w) throw new ServiceError("NOT_FOUND", "Warehouse not found", 404);
    return w;
  },

  /** Create a new warehouse. Requires OWNER/MANAGER. */
  async create(ctx: Ctx, input: WarehouseInput) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.warehouse.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
    });
    if (existing) {
      throw new ServiceError("CONFLICT", "Warehouse with this name already exists", 400);
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: input.name,
        code: input.code || null,
        isActive: input.isActive ?? true,
      },
    });

    await auditLogService.log(ctx, {
      entity: "Warehouse",
      entityId: warehouse.id,
      action: "CREATE",
      diff: warehouse,
    });

    return warehouse;
  },

  /** Update warehouse. Requires MANAGER+. */
  async update(ctx: Ctx, id: string, input: WarehouseInput) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw new ServiceError("NOT_FOUND", "Warehouse not found", 404);

    if (input.name !== existing.name) {
      const nameCheck = await prisma.warehouse.findFirst({
        where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
      });
      if (nameCheck) {
        throw new ServiceError("CONFLICT", "Warehouse with this name already exists", 400);
      }
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code || null,
        isActive: input.isActive ?? true,
      },
    });

    await auditLogService.log(ctx, {
      entity: "Warehouse",
      entityId: id,
      action: "UPDATE",
      diff: { before: existing, after: updated },
    });

    return updated;
  },

  /** Delete a warehouse. Requires OWNER. */
  async remove(ctx: Ctx, id: string) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        stocks: { take: 1 },
        sales: { take: 1 },
        purchases: { take: 1 },
      },
    });

    if (!existing) throw new ServiceError("NOT_FOUND", "Warehouse not found", 404);

    // Prevent deletion if it has relations
    if (existing.stocks.length > 0 || existing.sales.length > 0 || existing.purchases.length > 0) {
      throw new ServiceError("CONFLICT", "Cannot delete a warehouse that has stock, sales, or purchases tied to it. Consider deactivating it instead.", 400);
    }

    await prisma.warehouse.delete({ where: { id } });

    await auditLogService.log(ctx, {
      entity: "Warehouse",
      entityId: id,
      action: "DELETE",
      diff: existing,
    });
  },
};
