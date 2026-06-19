/**
 * Stock transfer service — Prisma-backed, framework-agnostic.
 *
 * Scoped by `ctx.shopId` (multi-tenant).
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";
import { inventoryService } from "./inventoryService";

export interface TransferInput {
  fromBranchId: string;
  toBranchId: string;
  notes?: string;
  items: Array<{
    productId: string;
    qty: number;
  }>;
}

export const transfersService = {
  /** List all transfers for the shop (paginated). */
  async list(ctx: Ctx, params?: PaginationParams) {
    const raw = await paginate<any>(
      prisma.transfer,
      { where: { shopId: ctx.shopId }, include: { items: true } },
      params,
      { orderBy: { createdAt: "desc" as const } },
    );

    // Fetch branch names for frontend convenience
    const branches = await prisma.branch.findMany({
      where: { shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    const products = await prisma.product.findMany({
      where: { shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return {
      ...raw,
      items: raw.items.map((t: any) => ({
        id: t.id,
        fromBranchId: t.fromBranchId,
        fromBranchName: branchMap.get(t.fromBranchId) || "Unknown",
        toBranchId: t.toBranchId,
        toBranchName: branchMap.get(t.toBranchId) || "Unknown",
        status: t.status,
        note: t.notes || "",
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString() || null,
        items: t.items.map((item: any) => ({
          productId: item.productId,
          name: productMap.get(item.productId) || "Unknown",
          qty: item.qty,
        })),
      })),
    };
  },

  /** Get transfer by ID. */
  async getById(ctx: Ctx, id: string) {
    const t = await prisma.transfer.findFirst({
      where: { id, shopId: ctx.shopId },
      include: { items: true },
    });

    if (!t) throw new ServiceError("NOT_FOUND", "Transfer not found", 404);

    const branches = await prisma.branch.findMany({
      where: { shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    const products = await prisma.product.findMany({
      where: { shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return {
      id: t.id,
      fromBranchId: t.fromBranchId,
      fromBranchName: branchMap.get(t.fromBranchId) || "Unknown",
      toBranchId: t.toBranchId,
      toBranchName: branchMap.get(t.toBranchId) || "Unknown",
      status: t.status,
      note: t.notes || "",
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() || null,
      items: t.items.map((item) => ({
        productId: item.productId,
        name: productMap.get(item.productId) || "Unknown",
        qty: item.qty,
      })),
    };
  },

  /** Create a new transfer. Requires MANAGER+. */
  async create(ctx: Ctx, input: TransferInput) {
    requireRole(ctx, "MANAGER");

    if (!input.fromBranchId || !input.toBranchId) {
      throw new ServiceError("VALIDATION", "Source and destination branches required", 400);
    }
    if (input.fromBranchId === input.toBranchId) {
      throw new ServiceError("VALIDATION", "Source and destination must differ", 400);
    }
    if (!input.items?.length) {
      throw new ServiceError("VALIDATION", "At least one item is required", 400);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Verify branches belong to shop
      const fromBranch = await tx.branch.findFirst({ where: { id: input.fromBranchId, shopId: ctx.shopId } });
      const toBranch = await tx.branch.findFirst({ where: { id: input.toBranchId, shopId: ctx.shopId } });

      if (!fromBranch || !toBranch) {
        throw new ServiceError("NOT_FOUND", "One or both branches not found", 404);
      }

      // 2. Create transfer in database (default status: PENDING)
      const t = await tx.transfer.create({
        data: {
          shopId: ctx.shopId,
          fromBranchId: input.fromBranchId,
          toBranchId: input.toBranchId,
          status: "PENDING",
          notes: input.notes || null,
          items: {
            create: input.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
            })),
          },
        },
        include: { items: true },
      });

      return {
        id: t.id,
        fromBranchId: t.fromBranchId,
        fromBranchName: fromBranch.name,
        toBranchId: t.toBranchId,
        toBranchName: toBranch.name,
        status: t.status,
        note: t.notes || "",
        createdAt: t.createdAt.toISOString(),
        completedAt: null,
        items: input.items, // Simplification or resolve product names
      };
    });
  },

  /** Dispatch a transfer (sets status to IN_TRANSIT, deducts stock from source branch). Requires MANAGER+. */
  async dispatch(ctx: Ctx, id: string) {
    requireRole(ctx, "MANAGER");

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id, shopId: ctx.shopId },
        include: { items: true },
      });

      if (!transfer) throw new ServiceError("NOT_FOUND", "Transfer not found", 404);
      if (transfer.status !== "PENDING") {
        throw new ServiceError("CONFLICT", "Only pending transfers can be dispatched", 400);
      }

      // Verify and deduct stock from source warehouse
      const fromWarehouse = await tx.warehouse.findFirst({ where: { branchId: transfer.fromBranchId } });
      if (!fromWarehouse) throw new ServiceError("NOT_FOUND", "Source warehouse not found", 404);

      const productIds = transfer.items.map((i) => i.productId);
      const trackedProducts = await tx.product.findMany({
        where: { id: { in: productIds }, trackSerials: true },
        select: { id: true },
      });
      const trackedIds = new Set(trackedProducts.map((p) => p.id));

      for (const item of transfer.items) {
        const stock = await tx.warehouseStock.findUnique({
          where: { warehouseId_productId: { warehouseId: fromWarehouse.id, productId: item.productId } },
        });

        if (!stock || stock.qty < item.qty) {
          throw new ServiceError("OUT_OF_STOCK", `Insufficient stock at source warehouse for product ID ${item.productId}`, 400);
        }

        if (trackedIds.has(item.productId)) {
          const serialCount = await tx.serialNumber.count({
            where: {
              shopId: ctx.shopId,
              productId: item.productId,
              status: "IN_STOCK",
              warehouseId: fromWarehouse.id,
            },
          });
          if (serialCount < item.qty) {
            throw new ServiceError(
              "VALIDATION",
              `Insufficient serial numbers in source warehouse for product ID ${item.productId}. Expected: ${item.qty}, Found: ${serialCount}`,
              400,
            );
          }
        }

        await tx.warehouseStock.update({
          where: { id: stock.id },
          data: { qty: { decrement: item.qty } },
        });
      }

      await tx.transfer.update({
        where: { id },
        data: { status: "IN_TRANSIT" },
      });
    });
  },

  /** Receive a transfer (sets status to COMPLETED, adds stock to destination branch). Requires MANAGER+. */
  async receive(ctx: Ctx, id: string) {
    requireRole(ctx, "MANAGER");

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id, shopId: ctx.shopId },
        include: { items: true },
      });

      if (!transfer) throw new ServiceError("NOT_FOUND", "Transfer not found", 404);
      if (transfer.status !== "IN_TRANSIT" && transfer.status !== "PENDING") {
        throw new ServiceError("CONFLICT", "Only pending or in-transit transfers can be received", 400);
      }

      // If it was still pending, deduct from fromBranchId first
      if (transfer.status === "PENDING") {
        const fromWarehouse = await tx.warehouse.findFirst({ where: { branchId: transfer.fromBranchId } });
        if (!fromWarehouse) throw new ServiceError("NOT_FOUND", "Source warehouse not found", 404);

        for (const item of transfer.items) {
          const stock = await tx.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId: fromWarehouse.id, productId: item.productId } },
          });

          if (!stock || stock.qty < item.qty) {
            throw new ServiceError("OUT_OF_STOCK", `Insufficient stock at source warehouse for product ID ${item.productId}`, 400);
          }

          await tx.warehouseStock.update({
            where: { id: stock.id },
            data: { qty: { decrement: item.qty } },
          });
        }
      }

      // Add stock to destination warehouse
      const toWarehouse = await tx.warehouse.findFirst({ where: { branchId: transfer.toBranchId } });
      if (!toWarehouse) throw new ServiceError("NOT_FOUND", "Destination warehouse not found", 404);

      for (const item of transfer.items) {
        await tx.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: toWarehouse.id, productId: item.productId } },
          create: {
            warehouseId: toWarehouse.id,
            productId: item.productId,
            qty: item.qty,
          },
          update: {
            qty: { increment: item.qty },
          },
        });
      }

      // Transfer serial numbers (FIFO) for serial-tracked products
      const fromWarehouse = await tx.warehouse.findFirst({ where: { branchId: transfer.fromBranchId } });
      if (!fromWarehouse) throw new ServiceError("NOT_FOUND", "Source warehouse not found", 404);

      const productIds = transfer.items.map((i) => i.productId);
      const trackedProducts = await tx.product.findMany({
        where: { id: { in: productIds }, trackSerials: true },
        select: { id: true },
      });
      const trackedIds = new Set(trackedProducts.map((p) => p.id));

      for (const item of transfer.items) {
        if (!trackedIds.has(item.productId)) continue;

        // Fetch FIFO serials in the source warehouse
        const serials = await tx.serialNumber.findMany({
          where: {
            shopId: ctx.shopId,
            productId: item.productId,
            status: "IN_STOCK",
            warehouseId: fromWarehouse.id,
          },
          orderBy: { createdAt: "asc" },
          take: item.qty,
          select: { id: true },
        });

        if (serials.length < item.qty) {
          throw new ServiceError(
            "VALIDATION",
            `Insufficient serial numbers in source warehouse for product ID ${item.productId}. Expected: ${item.qty}, Found: ${serials.length}`,
            400,
          );
        }

        // Update warehouseId to destination warehouse
        const serialIds = serials.map((s) => s.id);
        await tx.serialNumber.updateMany({
          where: { id: { in: serialIds } },
          data: { warehouseId: toWarehouse.id },
        });

        // Sync physical serial counts (Fix #4)
        // Sync source warehouse stock
        await inventoryService.syncStockCount(tx, ctx.shopId, fromWarehouse.id, item.productId);
        // Sync destination warehouse stock
        await inventoryService.syncStockCount(tx, ctx.shopId, toWarehouse.id, item.productId);
      }

      await tx.transfer.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      await auditLogService.log(ctx, {
        entity: "Transfer",
        entityId: id,
        action: "UPDATE",
        diff: { status: "COMPLETED" },
      });
    });
  },

  /** Cancel a transfer (restores stock to source branch if it was already in transit). Requires MANAGER+. */
  async cancel(ctx: Ctx, id: string) {
    requireRole(ctx, "MANAGER");

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id, shopId: ctx.shopId },
        include: { items: true },
      });

      if (!transfer) throw new ServiceError("NOT_FOUND", "Transfer not found", 404);
      if (transfer.status === "COMPLETED" || transfer.status === "CANCELLED") {
        throw new ServiceError("CONFLICT", `Cannot cancel a ${transfer.status} transfer`, 400);
      }

      // If it was already in transit, restore the stock back to the source warehouse
      if (transfer.status === "IN_TRANSIT") {
        const fromWarehouse = await tx.warehouse.findFirst({ where: { branchId: transfer.fromBranchId } });
        if (!fromWarehouse) throw new ServiceError("NOT_FOUND", "Source warehouse not found", 404);

        for (const item of transfer.items) {
          await tx.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId: fromWarehouse.id, productId: item.productId } },
            create: {
              warehouseId: fromWarehouse.id,
              productId: item.productId,
              qty: item.qty,
            },
            update: {
              qty: { increment: item.qty },
            },
          });
        }
      }

      await tx.transfer.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await auditLogService.log(ctx, {
        entity: "Transfer",
        entityId: id,
        action: "UPDATE",
        diff: { status: "CANCELLED" },
      });
    });
  },

  /** Delete a transfer record. Requires OWNER. */
  async remove(ctx: Ctx, id: string) {
    requireRole(ctx, "OWNER");

    const transfer = await prisma.transfer.findFirst({
      where: { id, shopId: ctx.shopId },
    });

    if (!transfer) throw new ServiceError("NOT_FOUND", "Transfer not found", 404);
    if (transfer.status === "IN_TRANSIT") {
      throw new ServiceError("CONFLICT", "Cannot delete a transfer currently in transit", 400);
    }

    await prisma.transfer.delete({
      where: { id },
    });
  },

  /** Update transfer notes/metadata. Requires MANAGER+. Only PENDING transfers can be updated. */
  async update(ctx: Ctx, id: string, data: { notes?: string }) {
    requireRole(ctx, "MANAGER");

    const transfer = await prisma.transfer.findFirst({
      where: { id, shopId: ctx.shopId },
    });

    if (!transfer) throw new ServiceError("NOT_FOUND", "Transfer not found", 404);
    if (transfer.status !== "PENDING") {
      throw new ServiceError("CONFLICT", "Only pending transfers can be updated", 400);
    }

    const updated = await prisma.transfer.update({
      where: { id },
      data: { notes: data.notes ?? null },
      include: { items: true },
    });

    return updated;
  },
};
