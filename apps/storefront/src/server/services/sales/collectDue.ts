import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import * as math from "@/server/lib/math";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { mapPaymentMethodToTenderType, serializeSale } from "@/server/lib/serialize";

export interface CollectDueInput {
  amount: number;
  accountId: string;
  type: string;
  notes?: string;
}

/** Collect due for a specific sale. */
export async function collectDue(ctx: Ctx, saleId: string, input: CollectDueInput) {
  if (input.amount <= 0) {
    throw new ServiceError("VALIDATION", "Payment amount must be greater than 0", 400);
  }

  const raw = await prisma.$transaction(async (tx) => {
    // 1. Validate sale
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { customer: true },
    });

    if (!sale) {
      throw new ServiceError("NOT_FOUND", "Sale not found", 404);
    }
    if (sale.status !== "COMPLETED") {
      throw new ServiceError("VALIDATION", "Can only collect due on COMPLETED sales", 400);
    }
    
    const currentDue = Number(sale.due);
    const currentPaid = Number(sale.paid);

    if (currentDue <= 0) {
      throw new ServiceError("VALIDATION", "This sale has no due", 400);
    }

    if (input.amount > currentDue) {
      throw new ServiceError(
        "VALIDATION",
        `Payment amount (${input.amount}) exceeds the remaining due (${currentDue})`,
        400
      );
    }

    // 2. Validate account
    const account = await tx.financialAccount.findUnique({
      where: { id: input.accountId },
    });
    if (!account) {
      throw new ServiceError("NOT_FOUND", "Financial account not found", 404);
    }

    // 3. Update Sale
    const newPaid = math.add(currentPaid, input.amount);
    const newDue = math.sub(currentDue, input.amount);

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: {
        paid: newPaid,
        due: newDue,
        tenders: {
          create: {
            type: mapPaymentMethodToTenderType(input.type),
            amount: input.amount,
            accountId: input.accountId,
            ref: `DUE-COLLECT`,
          },
        },
      },
      include: {
        items: { include: { serialNumbers: true } },
        tenders: true,
        customer: true,
        editedBy: true,
        user: true,
      }
    });

    // 4. Update Customer due and ledger
    if (sale.customerId) {
      const cust = await tx.customer.findUniqueOrThrow({
        where: { id: sale.customerId },
        select: { due: true },
      });
      
      const runningDue = Number(cust.due);
      const newCustomerDue = Math.max(0, math.sub(runningDue, input.amount));

      await tx.customer.update({
        where: { id: sale.customerId },
        data: { due: newCustomerDue },
      });

      // Log payment in customer transaction ledger
      const invoiceNo = (sale.data as any)?.invoiceNo || sale.id.slice(0, 8);
      await tx.customerTransaction.create({
        data: {
          customerId: sale.customerId,
          type: "PAYMENT",
          amount: input.amount,
          balanceBefore: runningDue,
          balanceAfter: newCustomerDue,
          saleId: sale.id,
          accountId: input.accountId,
          reference: `COLLECT-${sale.id.slice(0, 8).toUpperCase()}`,
          notes: input.notes || `Collected due for Invoice ${invoiceNo}`,
          createdById: ctx.userId,
        },
      });
    }

    return updatedSale;
  }, { timeout: 15000 });

  // Post-process (audit log, invalidations)
  await Promise.all([
    auditLogService.log(ctx, {
      entity: "Sale",
      entityId: raw.id,
      action: "UPDATE",
      diff: { amount: input.amount, accountId: input.accountId },
    }),
    cache.invalidateSales(),
  ]);

  return serializeSale(raw);
}
