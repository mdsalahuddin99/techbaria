/**
 * Inventory service — stock adjustments, low-stock alerts.
 *
 * Adjustments are append-only (immutable audit trail).
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";
import { cache, cacheKeys, TTL } from "@/lib/cache";

export interface AdjustmentInput {
  productId: string;
  warehouseId?: string;
  qtyDelta: number; // positive = add, negative = subtract
  reason: "DAMAGE" | "LOSS" | "THEFT" | "CORRECTION" | "RECEIVED" | "OTHER";
  notes?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const inventoryService = {
  /** Snapshot of current stock levels for all products. */
  async snapshot(ctx: Ctx) {
    return cache.fetch(cacheKeys.inventory.snapshot("default"), TTL.INVENTORY_SNAPSHOT, async () => {
      return prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          reorderLevel: true,
          unit: true,
        },
        orderBy: { name: "asc" },
      });
    });
  },

  /** List all stock adjustments (paginated). */
  async listAdjustments(ctx: Ctx, params?: PaginationParams) {
    return paginate(
      prisma.stockAdjustment,
      {},
      params,
      { orderBy: { createdAt: "desc" as const } },
    );
  },

  /** Adjust stock for a product. Requires MANAGER+. Append-only. */
  async adjust(ctx: Ctx, input: AdjustmentInput) {
    requireRole(ctx, "MANAGER");

    if (!input.qtyDelta || input.qtyDelta === 0) {
      throw new ServiceError("VALIDATION", "Quantity delta must be non-zero");
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) {
      throw new ServiceError("NOT_FOUND", "Product not found", 404);
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      // Create the adjustment record (immutable audit trail)
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          qtyDelta: input.qtyDelta,
          reason: input.reason,
          notes: input.notes,
          userId: ctx.userId,
        },
      });

      // Apply the delta to the product stock
      await tx.product.update({
        where: { id: input.productId },
        data: { stock: { increment: input.qtyDelta } },
      });

      // Apply the delta to warehouse stock (if warehouseId is provided)
      if (input.warehouseId) {
        const existingWarehouseStock = await tx.warehouseStock.findFirst({
          where: { warehouseId: input.warehouseId, productId: input.productId },
        });

        if (existingWarehouseStock) {
          await tx.warehouseStock.update({
            where: { id: existingWarehouseStock.id },
            data: { qty: { increment: input.qtyDelta } },
          });
        } else {
          await tx.warehouseStock.create({
            data: {
              warehouseId: input.warehouseId,
              productId: input.productId,
              qty: input.qtyDelta,
            },
          });
        }
      }

      // Sync physical serial count (Fix #4)
      await inventoryService.syncStockCount(tx, input.warehouseId, input.productId);

      await auditLogService.log(ctx, {
        entity: "StockAdjustment",
        entityId: adjustment.id,
        action: "CREATE",
        diff: { productId: input.productId, qtyDelta: input.qtyDelta, reason: input.reason },
      });

      return adjustment;
    });

    await cache.invalidateInventory("default");
    await cache.invalidateSpecificProducts("default", [input.productId]);

    return adjustment;
  },

  /** Products where stock ≤ reorderLevel. */
  async lowStock(ctx: Ctx) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Product" WHERE "stock" <= "reorderLevel" ORDER BY ("reorderLevel" - "stock") DESC`
    );
  },

  /** Products where stock = 0. */
  async outOfStock(ctx: Ctx) {
    return prisma.product.findMany({
      where: { stock: { lte: 0 } },
      orderBy: { name: "asc" },
    });
  },

  /** Warehouse-level stock (multi-warehouse support). */
  async warehouseStock(ctx: Ctx, warehouseId: string) {
    return prisma.warehouseStock.findMany({
      where: { warehouseId },
      include: { product: { select: { name: true, sku: true, unit: true } } },
    });
  },

  /** Reconcile physical serial count in a warehouse/shop with WarehouseStock and Product aggregates. */
  async syncStockCount(tx: any, warehouseId: string | null | undefined, productId: string) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { trackSerials: true },
    });
    if (!product || !product.trackSerials) return;

    if (warehouseId) {
      const serialCountInWarehouse = await tx.serialNumber.count({
        where: { productId, warehouseId, status: "IN_STOCK" },
      });

      await tx.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: { warehouseId, productId, qty: serialCountInWarehouse },
        update: { qty: serialCountInWarehouse },
      });
    }

    const totalSerialCount = await tx.serialNumber.count({
      where: { productId, status: "IN_STOCK" },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stock: totalSerialCount },
    });
  },
};
