export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import { cache } from "@/lib/cache";
import type { Ctx } from "@/server/lib/ctx";

/**
 * POST /api/serials/cleanup-orphaned
 * Deletes a single orphaned IN_STOCK serial (one whose product stock is 0,
 * meaning it was left behind after its purchase was deleted).
 *
 * Body: { serial: string }
 */
export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await req.json();
  const serial: string = (body?.serial ?? "").trim();

  if (!serial) {
    return { deleted: false, reason: "No serial provided" };
  }

  // Look up the serial record
  const record = await prisma.serialNumber.findUnique({
    where: { serial },
    select: {
      id: true,
      status: true,
      productId: true,
      saleItemId: true,
      product: { select: { stock: true, name: true } },
    },
  });

  if (!record) {
    return { deleted: false, reason: "Serial not found" };
  }

  // Only delete if:
  // - Status is IN_STOCK (not sold or otherwise committed)
  // - Not linked to any sale item
  // - Product stock is 0 or negative (orphaned — product inventory was corrected elsewhere)
  const isOrphaned =
    record.status === "IN_STOCK" &&
    !record.saleItemId &&
    Number(record.product?.stock ?? 0) <= 0;

  if (!isOrphaned) {
    return {
      deleted: false,
      reason: `Serial is not orphaned (status=${record.status}, stock=${record.product?.stock}, saleItemId=${record.saleItemId})`,
    };
  }

  await prisma.serialNumber.delete({ where: { id: record.id } });

  // Invalidate product cache so the serial no longer appears in the products list
  await cache.invalidateSpecificProducts([record.productId]);

  return {
    deleted: true,
    serial,
    productId: record.productId,
    productName: record.product?.name,
  };
});
