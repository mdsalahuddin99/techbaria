/**
 * Serial / IMEI number tracking service.
 *
 * Tracks individual unit serials through the inventory lifecycle:
 *   Purchase → IN_STOCK → Sale → SOLD
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";

export const serialStatus = {
  IN_STOCK: "IN_STOCK" as const,
  SOLD: "SOLD" as const,
  EXPIRED: "EXPIRED" as const,
  DAMAGED: "DAMAGED" as const,
};

type SerialStatus = (typeof serialStatus)[keyof typeof serialStatus];

export interface SerialEntry {
  serial: string;
  productId: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const serialService = {
  /** Add serial numbers to inventory (from purchase). */
  async addFromPurchase(ctx: Ctx, serials: SerialEntry[], purchaseItemId: string) {
    const data = serials.map((s) => ({
      productId: s.productId,
      serial: s.serial,
      status: "IN_STOCK" as SerialStatus,
      purchaseItemId,
    }));
    // Batch create, skip duplicates silently
    await prisma.serialNumber.createMany({ data, skipDuplicates: true });
  },

  /** Reserve (mark SOLD) serial numbers when a sale is completed. */
  async reserveForSale(ctx: Ctx, serials: SerialEntry[], saleItemId: string) {
    for (const s of serials) {
      const record = await prisma.serialNumber.findFirst({
        where: {
          productId: s.productId,
          serial: s.serial,
          status: "IN_STOCK",
        },
      });
      if (!record) {
        throw new ServiceError(
          "VALIDATION",
          `Serial "${s.serial}" not found or already sold`,
          400,
        );
      }
      await prisma.serialNumber.update({
        where: { id: record.id },
        data: { status: "SOLD", saleItemId, soldAt: new Date() },
      });
    }
  },

  /** Release serials back to IN_STOCK (void/refund). */
  async releaseFromSale(ctx: Ctx, saleItemId: string) {
    await prisma.serialNumber.updateMany({
      where: { saleItemId },
      data: { status: "IN_STOCK", saleItemId: null, soldAt: null },
    });
  },

  /** List available (IN_STOCK) serials for a product. */
  async listAvailable(ctx: Ctx, productId: string): Promise<string[]> {
    const records = await prisma.serialNumber.findMany({
      where: { productId, status: "IN_STOCK" },
      select: { serial: true },
      orderBy: { createdAt: "asc" },
    });
    return records.map((r) => r.serial);
  },

  /** Get serials linked to a specific sale (for invoice display). */
  async listBySaleItem(saleItemId: string): Promise<string[]> {
    const records = await prisma.serialNumber.findMany({
      where: { saleItemId },
      select: { serial: true },
      orderBy: { createdAt: "asc" },
    });
    return records.map((r) => r.serial);
  },
};
