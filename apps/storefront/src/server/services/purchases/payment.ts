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
  requireRole(ctx, "ADMIN");

  const purchase = await prisma.purchase.findFirst({
    where: { id },
    select: { id: true, paid: true, total: true },
  });
  if (!purchase) {
    throw new ServiceError("NOT_FOUND", "Purchase not found", 404);
  }

  if (payment.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: payment.accountId },
      select: { id: true },
    });
    if (!account) {
      throw new ServiceError("NOT_FOUND", "Financial account not found", 404);
    }
  }

  await prisma.$transaction(async (tx) => {
    const currentDue = Math.max(0, Number(purchase.total) - Number(purchase.paid));
    const appliedAmount = Math.min(payment.amount, currentDue);
    const overpayment = Math.max(0, payment.amount - appliedAmount);

    // Create the tender record
    await tx.purchaseTender.create({
      data: {
        purchaseId: id,
        type: mapPaymentMethodToTenderType(payment.method),
        amount: appliedAmount, // Only apply up to the due amount
        accountId: payment.accountId === "WALLET" ? undefined : payment.accountId,
        ref: payment.note,
      },
    });

    // Deduct from account balance
    if (payment.accountId) {
      await tx.financialAccount.update({
        where: { id: payment.accountId },
        data: { balance: { decrement: payment.amount } },
      });

      // If overpayment, add it to supplier advance balance
      if (overpayment > 0) {
        const rawPurchase = await tx.purchase.findFirst({
          where: { id },
          select: { supplierId: true, invoiceNo: true },
        });
        if (rawPurchase?.supplierId) {
          const supp = await tx.supplier.findUnique({
            where: { id: rawPurchase.supplierId },
            select: { advanceBalance: true }
          });
          const currentAdvance = Number(supp?.advanceBalance || 0);
          const newAdvance = currentAdvance + overpayment;
          
          await tx.supplier.update({
            where: { id: rawPurchase.supplierId },
            data: { advanceBalance: newAdvance }
          });
          
          await tx.supplierTransaction.create({
            data: {
              supplierId: rawPurchase.supplierId,
              type: "PAYMENT", // or ADJUSTMENT
              amount: overpayment,
              balanceBefore: currentAdvance,
              balanceAfter: newAdvance,
              purchaseId: id,
              notes: `Overpayment on purchase invoice ${rawPurchase.invoiceNo || id.slice(0, 8)} added to advance`
            }
          });
        }
      }
    }

    // Update purchase paid + due
    const newPaid = Number(purchase.paid) + appliedAmount;
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
