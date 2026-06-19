import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import { mapPaymentMethodToTenderType } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";

/** Record a payment against an existing purchase. */
export async function addPayment(ctx: Ctx, id: string, payment: {
  amount: number;
  method: string;
  accountId?: string;
  note?: string;
}) {
  requireRole(ctx, "MANAGER");

  const purchase = await prisma.purchase.findFirst({
    where: { id, shopId: ctx.shopId },
    select: { id: true, paid: true, total: true },
  });
  if (!purchase) {
    throw new ServiceError("NOT_FOUND", "Purchase not found", 404);
  }

  if (payment.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: payment.accountId, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!account) {
      throw new ServiceError("NOT_FOUND", "Financial account not found", 404);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Create the tender record
    await tx.purchaseTender.create({
      data: {
        purchaseId: id,
        type: mapPaymentMethodToTenderType(payment.method),
        amount: payment.amount,
        accountId: payment.accountId,
        ref: payment.note,
      },
    });

    // Deduct from account balance
    if (payment.accountId) {
      await tx.financialAccount.update({
        where: { id: payment.accountId, shopId: ctx.shopId },
        data: { balance: { decrement: payment.amount } },
      });
    }

    // Update purchase paid + due
    const newPaid = Number(purchase.paid) + payment.amount;
    const newDue = Math.max(0, Number(purchase.total) - newPaid);
    await tx.purchase.update({
      where: { id },
      data: { paid: newPaid, due: newDue },
    });
  }, { timeout: 30000 });

  await auditLogService.log(ctx, {
    entity: "Purchase",
    entityId: id,
    action: "UPDATE",
    diff: { paymentAmount: payment.amount, method: payment.method },
  });
}
