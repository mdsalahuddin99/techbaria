import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import { mapPaymentMethodToTenderType } from "@/server/lib/serialize";
import { auditLogService } from "../auditLogService";

export interface BulkPaySupplierDueInput {
  supplierId: string;
  amount: number;
  accountId: string;
  method: string;
  notes?: string;
}

export interface BulkPaySupplierDueResult {
  transactionId: string;
  totalPaid: number;
  invoicesAffected: {
    purchaseId: string;
    invoiceNo: string;
    date: Date;
    total: number;
    previousDue: number;
    paidAmount: number;
    newDue: number;
  }[];
}

export async function bulkPaySupplierDue(ctx: Ctx, input: BulkPaySupplierDueInput): Promise<BulkPaySupplierDueResult> {
  if (input.amount <= 0) {
    throw new ServiceError("VALIDATION", "Payment amount must be greater than 0", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Validate supplier
    const supplier = await tx.supplier.findUnique({
      where: { id: input.supplierId },
      select: { id: true, name: true, payable: true, advanceBalance: true },
    });
    
    if (!supplier) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }
    
    const currentSupplierPayable = Number(supplier.payable);
    
    if (currentSupplierPayable <= 0) {
      throw new ServiceError("VALIDATION", "Supplier has no payable due", 400);
    }

    // 2. Validate account
    const isWallet = input.accountId === "WALLET" || input.method === "Wallet";
    if (!isWallet && input.accountId) {
      const account = await tx.financialAccount.findUnique({
        where: { id: input.accountId },
      });
      if (!account) {
        throw new ServiceError("NOT_FOUND", "Financial account not found", 404);
      }
    }

    let supplierAdvance = Number(supplier.advanceBalance);
    if (isWallet) {
      if (supplierAdvance < input.amount) {
        throw new ServiceError("CONFLICT", `Insufficient wallet advance. Available: ${supplierAdvance}`, 400);
      }
      supplierAdvance -= input.amount;
    }

    // 3. Find purchases with due, oldest first
    const purchasesWithDue = await tx.purchase.findMany({
      where: {
        supplierId: input.supplierId,
        due: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    const bulkRef = `BULK-PAY-${Date.now().toString().slice(-6)}`;
    let remainingAmount = input.amount;
    const invoicesAffected: BulkPaySupplierDueResult["invoicesAffected"] = [];
    
    // 4. Distribute payment across purchases
    for (const purchase of purchasesWithDue) {
      if (remainingAmount <= 0) break;
      
      const purchaseDue = Number(purchase.due);
      const paidAmount = Math.min(purchaseDue, remainingAmount);
      
      const newPaid = Number(purchase.paid) + paidAmount;
      const newDue = purchaseDue - paidAmount;
      
      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          paid: newPaid,
          due: newDue,
          tenders: {
            create: {
              type: mapPaymentMethodToTenderType(input.method),
              amount: paidAmount,
              accountId: isWallet ? undefined : input.accountId,
              ref: bulkRef,
            }
          }
        }
      });
      
      invoicesAffected.push({
        purchaseId: purchase.id,
        invoiceNo: purchase.invoiceNo || purchase.id.slice(0, 8),
        date: purchase.createdAt,
        total: Number(purchase.total),
        previousDue: purchaseDue,
        paidAmount: paidAmount,
        newDue: newDue,
      });
      
      remainingAmount -= paidAmount;
    }

    // 4.5. Update Financial Account balance (unless Wallet)
    if (!isWallet && input.accountId) {
      await tx.financialAccount.update({
        where: { id: input.accountId },
        data: { balance: { decrement: input.amount } },
      });
    }

    // 5. Update Supplier payable and advance balance
    const appliedAmount = input.amount - remainingAmount;
    const newSupplierPayable = Math.max(0, currentSupplierPayable - appliedAmount);
    
    if (remainingAmount > 0) {
      supplierAdvance += remainingAmount;
    }
    
    await tx.supplier.update({
      where: { id: input.supplierId },
      data: { payable: newSupplierPayable, advanceBalance: supplierAdvance },
    });

    // 6. Log bulk payment in supplier transaction ledger
    const txEntry = await tx.supplierTransaction.create({
      data: {
        supplierId: input.supplierId,
        type: "PAYMENT",
        amount: input.amount,
        balanceBefore: Number(supplier.advanceBalance),
        balanceAfter: supplierAdvance,
        accountId: isWallet ? undefined : input.accountId,
        reference: bulkRef,
        notes: input.notes || `Bulk paid due across ${invoicesAffected.length} invoices` + (isWallet ? ' from wallet' : '') + (remainingAmount > 0 && !isWallet ? ` (Overpayment: ৳${remainingAmount} added to advance)` : ''),
        createdById: ctx.userId,
      },
    });
    
    await tx.supplierPayment.create({
      data: {
        supplierId: input.supplierId,
        amount: input.amount,
        accountId: isWallet ? null : input.accountId,
        notes: input.notes || bulkRef,
      }
    });

    return {
      transactionId: txEntry.id,
      totalPaid: input.amount,
      invoicesAffected,
    };
  }, { timeout: 20000 });

  await auditLogService.log(ctx, {
    entity: "Supplier",
    entityId: input.supplierId,
    action: "UPDATE",
    diff: { action: "BULK_PAY_SUPPLIER_DUE", amount: input.amount, accountId: input.accountId },
  });

  return result;
}
