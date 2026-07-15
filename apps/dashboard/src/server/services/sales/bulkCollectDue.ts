import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import * as math from "@/server/lib/math";
import { auditLogService } from "../auditLogService";
import { cache } from "@/lib/cache";
import { mapPaymentMethodToTenderType } from "@/server/lib/serialize";

export interface BulkCollectDueInput {
  customerId: string;
  amount: number;
  accountId: string;
  type: string;
  notes?: string;
}

export interface BulkCollectDueResult {
  transactionId: string;
  totalCollected: number;
  invoicesAffected: {
    saleId: string;
    invoiceNo: string;
    date: Date;
    total: number;
    previousDue: number;
    collected: number;
    newDue: number;
  }[];
}

export async function bulkCollectDue(ctx: Ctx, input: BulkCollectDueInput): Promise<BulkCollectDueResult> {
  if (input.amount <= 0) {
    throw new ServiceError("VALIDATION", "Payment amount must be greater than 0", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Validate customer
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, name: true, due: true, balance: true },
    });
    
    if (!customer) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }
    
    const currentCustomerDue = Number(customer.due);
    
    if (currentCustomerDue <= 0) {
      throw new ServiceError("VALIDATION", "Customer has no due", 400);
    }
    
    if (input.amount > currentCustomerDue) {
      throw new ServiceError("VALIDATION", `Payment amount (${input.amount}) exceeds total due (${currentCustomerDue})`, 400);
    }

    // 2. Validate account
    const isWallet = input.accountId === "WALLET" || input.type === "Wallet";
    if (!isWallet) {
      const account = await tx.financialAccount.findUnique({
        where: { id: input.accountId },
      });
      if (!account) {
        throw new ServiceError("NOT_FOUND", "Financial account not found", 404);
      }
    }

    let customerBalance = Number(customer.balance);
    if (isWallet) {
      if (customerBalance < input.amount) {
        throw new ServiceError("CONFLICT", `Insufficient wallet advance. Available: ${customerBalance}`, 400);
      }
      customerBalance = math.sub(customerBalance, input.amount);
    }

    // 3. Find sales with due, oldest first
    const salesWithDue = await tx.sale.findMany({
      where: {
        customerId: input.customerId,
        due: { gt: 0 },
        status: "COMPLETED",
      },
      orderBy: { createdAt: 'asc' },
    });

    const bulkRef = `BULK-COLLECT-${Date.now().toString().slice(-6)}`;
    let remainingAmount = input.amount;
    const invoicesAffected: BulkCollectDueResult["invoicesAffected"] = [];
    
    // 4. Distribute payment across sales
    for (const sale of salesWithDue) {
      if (remainingAmount <= 0) break;
      
      const saleDue = Number(sale.due);
      const collectedAmount = Math.min(saleDue, remainingAmount);
      
      const newPaid = math.add(Number(sale.paid), collectedAmount);
      const newDue = math.sub(saleDue, collectedAmount);
      
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paid: newPaid,
          due: newDue,
          tenders: {
            create: {
              type: mapPaymentMethodToTenderType(input.type),
              amount: collectedAmount,
              accountId: undefined, // Prevent double-counting in ledger
              ref: bulkRef,
            }
          }
        }
      });
      
      invoicesAffected.push({
        saleId: sale.id,
        invoiceNo: (sale.data as any)?.invoiceNo || sale.id.slice(0, 8),
        date: sale.createdAt,
        total: Number(sale.total),
        previousDue: saleDue,
        collected: collectedAmount,
        newDue: newDue,
      });
      
      remainingAmount = math.sub(remainingAmount, collectedAmount);
    }

    // 4.5. Update Financial Account balance (unless Wallet)
    if (!isWallet && input.accountId) {
      await tx.financialAccount.update({
        where: { id: input.accountId },
        data: { balance: { increment: input.amount } },
      });
    }

    // 5. Update Customer due and balance
    const newCustomerDue = Math.max(0, math.sub(currentCustomerDue, input.amount));
    
    await tx.customer.update({
      where: { id: input.customerId },
      data: { due: newCustomerDue, balance: customerBalance },
    });

    // 6. Log bulk payment in customer transaction ledger
    const txEntry = await tx.customerTransaction.create({
      data: {
        customerId: input.customerId,
        type: "PAYMENT",
        amount: input.amount,
        balanceBefore: isWallet ? Number(customer.balance) : currentCustomerDue,
        balanceAfter: isWallet ? customerBalance : newCustomerDue,
        accountId: isWallet ? undefined : input.accountId,
        reference: bulkRef,
        notes: input.notes || `Bulk collected due across ${invoicesAffected.length} invoices` + (isWallet ? ' from wallet' : ''),
        createdById: ctx.userId,
      },
    });

    return {
      transactionId: txEntry.id,
      totalCollected: input.amount,
      invoicesAffected,
    };
  }, { timeout: 20000 });

  // Post-process
  await Promise.all([
    auditLogService.log(ctx, {
      entity: "Customer",
      entityId: input.customerId,
      action: "UPDATE",
      diff: { action: "BULK_COLLECT_DUE", amount: input.amount, accountId: input.accountId },
    }),
    cache.invalidateSales(),
    // Cache invalidation for customer will happen on client side via react-query
  ]);

  return result;
}
