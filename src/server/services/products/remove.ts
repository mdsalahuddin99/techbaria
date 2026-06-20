import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";

/** Delete a product. Requires OWNER.
 *  Blocked if the product has existing purchase history, sales, or serials
 *  to prevent data integrity loss.  */
export async function remove(ctx: Ctx, id: string) {
  requireRole(ctx, "OWNER");
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true, name: true, sku: true,
      _count: {
        select: {
          purchaseItems: true,
          saleItems: true,
          serialNumbers: true,
        },
      },
    },
  });
  if (!product) {
    throw new ServiceError("NOT_FOUND", "Product not found", 404);
  }

  const p = product as any;
  if (p._count.purchaseItems > 0 || p._count.saleItems > 0 || p._count.serialNumbers > 0) {
    throw new ServiceError(
      "VALIDATION",
      `Cannot delete "${p.name}" — এটি ইতিমধ্যে ${[
        p._count.purchaseItems > 0 ? `${p._count.purchaseItems} টি purchase` : "",
        p._count.saleItems > 0 ? `${p._count.saleItems} টি sale"` : "",
        p._count.serialNumbers > 0 ? `${p._count.serialNumbers} টি serial` : "",
      ].filter(Boolean).join(", ")}-এ ব্যবহৃত হয়েছে। শুধু edit করতে পারবেন।`,
      400,
    );
  }

  await prisma.product.delete({
    where: { id },
  });

  await cache.invalidateSpecificProducts("default", [id]);

  await auditLogService.log(ctx, {
    entity: "Product",
    entityId: id,
    action: "DELETE",
    diff: { name: product.name, sku: product.sku },
  });
}
