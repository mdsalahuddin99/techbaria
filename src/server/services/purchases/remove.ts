import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";

/** Delete a purchase. Requires MANAGER+.
 *  Blocked if any items exist — the purchase has already affected inventory. */
export async function remove(ctx: Ctx, id: string) {
  requireRole(ctx, "MANAGER");

  const purchase = await prisma.purchase.findFirst({
    where: { id, shopId: ctx.shopId },
    select: {
      id: true, invoiceNo: true, total: true,
      _count: { select: { items: true } },
    },
  });
  if (!purchase) {
    throw new ServiceError("NOT_FOUND", "Purchase not found", 404);
  }

  const p = purchase as any;
  if (p._count.items > 0) {
    throw new ServiceError(
      "VALIDATION",
      `Cannot delete purchase "${p.invoiceNo}" — ${p._count.items} টি item ইতিমধ্যে inventory-তে যোগ হয়েছে।`,
      400,
    );
  }

  await prisma.purchase.deleteMany({
    where: { id, shopId: ctx.shopId },
  });

  await cache.invalidatePurchases(ctx.shopId);

  await auditLogService.log(ctx, {
    entity: "Purchase",
    entityId: id,
    action: "DELETE",
    diff: { invoiceNo: purchase.invoiceNo, total: Number(purchase.total) },
  });
}
