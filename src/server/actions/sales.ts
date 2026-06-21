"use server";

import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ServiceError } from "@/server/lib/errors";
import { salesService, type RefundInput } from "@/server/services/salesService";
import { prisma } from "@/server/db/client";
import { requireRole } from "@/server/auth/rbac";
import { saleCreateSchema, refundCreateSchema, voidSaleSchema } from "@/shared/validators/sale";
import type { PaginationParams } from "@/server/lib/paginate";

/**
 * Helper to build an authenticated context for Server Actions.
 * Throws ServiceError if not authenticated.
 */
async function getActionCtx() {
  const session = await auth();
  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "User not authenticated", 401);
  }
  return buildCtx(session.user as any);
}

// ─── Sales API Actions ───────────────────────────────────────────────────────

export async function listSalesAction(channel?: "POS" | "STOREFRONT", customerId?: string, params?: PaginationParams) {
  const ctx = await getActionCtx();
  return salesService.list(ctx, params, { channel, customerId });
}

export async function getSaleByIdAction(id: string) {
  const ctx = await getActionCtx();
  return salesService.getById(ctx, id);
}

export async function getSalesByCustomerAction(customerId: string) {
  const ctx = await getActionCtx();
  return salesService.byCustomer(ctx, customerId);
}

export async function createSaleAction(input: any) {
  const ctx = await getActionCtx();
  const valid = saleCreateSchema.parse(input);
  return salesService.create(ctx, valid as any);
}

export async function updateSaleAction(id: string, input: any) {
  const ctx = await getActionCtx();
  return salesService.update(ctx, id, input);
}

export async function deleteSaleAction(id: string) {
  const ctx = await getActionCtx();
  await salesService.remove(ctx, id);
  return { success: true };
}

export async function voidSaleAction(saleId: string, reason: string) {
  const ctx = await getActionCtx();
  const valid = voidSaleSchema.parse({ reason });
  return salesService.void(ctx, saleId, valid.reason);
}

export async function refundSaleAction(saleId: string, input: any) {
  const ctx = await getActionCtx();
  const valid = refundCreateSchema.parse(input) as unknown as RefundInput;
  return salesService.refund(ctx, saleId, valid);
}

export async function deleteReturnAction(id: string) {
  const ctx = await getActionCtx();
  requireRole(ctx, "MANAGER");

  const sale = await prisma.sale.findFirst({
    where: { id, status: "REFUNDED" },
  });

  if (!sale) {
    throw new ServiceError("NOT_FOUND", "Return not found", 404);
  }

  // Delete tenders and items first, then the sale
  await prisma.$transaction([
    prisma.saleTender.deleteMany({ where: { saleId: sale.id } }),
    prisma.saleItem.deleteMany({ where: { saleId: sale.id } }),
    prisma.sale.delete({ where: { id: sale.id } }),
  ]);

  return { success: true };
}
