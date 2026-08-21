import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import * as math from "@/server/lib/math";

export const salesAccounting = {
  /** Validate customer and financial accounts belong to the current shop. */
  async validateCustomerAndAccounts(
    ctx: Ctx,
    customerId?: string,
    tenders?: Array<{ accountId?: string }>
  ): Promise<void> {
    const customerPromise = customerId
      ? prisma.customer.findFirst({
          where: { id: customerId },
          select: { id: true },
        })
      : Promise.resolve({ id: customerId });

    const accountIds = (tenders ?? [])
      .map((t) => t.accountId)
      .filter((id): id is string => !!id);

    const accountsPromise = accountIds.length > 0
      ? prisma.financialAccount.findMany({
          where: { id: { in: accountIds } },
          select: { id: true },
        })
      : Promise.resolve([]);

    const [customer, accounts] = await Promise.all([customerPromise, accountsPromise]);

    if (customerId && !customer) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    if (accountIds.length > 0 && accounts.length !== new Set(accountIds).size) {
      throw new ServiceError("VALIDATION", "Invalid or unauthorized financial account", 400);
    }
  },

  /** Apply customer due balance changes and log SALE/ADJUSTMENT transactions. */
  async applyCustomerDue(
    tx: any,
    ctx: Ctx,
    sale: { id: string },
    customerId: string,
    due: number,
    isUpdate = false,
    oldDue = 0
  ): Promise<void> {
    if (isUpdate) {
      // Fetch current customer state for ledger snapshots
      const cust = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { due: true, creditLimit: true, balance: true },
      });
      let runningDue = Number(cust.due);
      const currentBalance = Number(cust.balance);

      // Revert old due — create a compensating ADJUSTMENT ledger entry
      if (oldDue > 0) {
        const dueAfterRevert = Math.max(0, math.sub(runningDue, oldDue));
        await tx.customer.update({
          where: { id: customerId },
          data: { due: dueAfterRevert },
        });
        // Record reversal so ledger shows the correction
        await tx.customerTransaction.create({
          data: {
            customerId,
            type: "ADJUSTMENT",
            amount: -oldDue, // negative = due reduced
            balanceBefore: currentBalance,
            balanceAfter: currentBalance, // SALE/ADJUSTMENT on due doesn't affect wallet balance
            saleId: sale.id,
            reference: `EDIT-${sale.id.slice(0, 8).toUpperCase()}`,
            notes: `Sale edited — old due ৳${oldDue} reversed (Due changed: ${runningDue} -> ${dueAfterRevert})`,
            createdById: ctx.userId,
          },
        });
        runningDue = dueAfterRevert;
      }

      // Apply new due — create a new SALE ledger entry
      if (due > 0) {
        const creditLimit = Number(cust.creditLimit);
        const newDue = math.add(runningDue, due);
        if (creditLimit > 0 && newDue > creditLimit) {
          throw new ServiceError(
            "CONFLICT",
            `Credit limit exceeded. Limit: ${creditLimit}, Current: ${runningDue}, Attempted: ${due}`,
            409,
          );
        }
        await tx.customer.update({
          where: { id: customerId },
          data: { due: newDue },
        });
        await tx.customerTransaction.create({
          data: {
            customerId,
            type: "SALE",
            amount: due,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            saleId: sale.id,
            reference: `EDIT-${sale.id.slice(0, 8).toUpperCase()}`,
            notes: `Sale edited — new due ৳${due} (Due changed: ${runningDue} -> ${newDue})`,
            createdById: ctx.userId,
          },
        });
      }
    } else if (due > 0) {
      const cust = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { due: true, creditLimit: true, balance: true },
      });
      const currentDue = Number(cust.due);
      const newDue = math.add(currentDue, due);
      const creditLimit = Number(cust.creditLimit);
      const currentBalance = Number(cust.balance);
 
      if (creditLimit > 0 && newDue > creditLimit) {
        throw new ServiceError(
          "CONFLICT",
          `Credit limit exceeded. Limit: ${creditLimit}, Current: ${currentDue}, Attempted: ${due}`,
          409,
        );
      }

      await tx.customer.update({
        where: { id: customerId },
        data: { due: newDue },
      });

      await tx.customerTransaction.create({
        data: {
          customerId: customerId,
          type: "SALE",
          amount: due,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          saleId: sale.id,
          reference: `SALE-${sale.id.slice(0, 8).toUpperCase()}`,
          notes: `Sale generated due ৳${due} (Due changed: ${currentDue} -> ${newDue})`,
          createdById: ctx.userId,
        },
      });
    }
  },

  /** Revert customer due on void or delete. */
  async revertCustomerDue(
    tx: any,
    ctx: Ctx,
    saleId: string,
    customerId: string,
    dueAmount: number,
    isDelete = false
  ): Promise<void> {
    const cust = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { due: true, balance: true },
    });
    const currentBalance = Number(cust.balance);

    if (isDelete) {
      await tx.customer.update({
        where: { id: customerId },
        data: { due: { decrement: dueAmount } },
      });

      await tx.customerTransaction.create({
        data: {
          customerId: customerId,
          type: "ADJUSTMENT",
          amount: dueAmount, // or -dueAmount, though usually ADJUSTMENT is signed
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          saleId,
          reference: `DELETE-${saleId.slice(0, 8).toUpperCase()}`,
          notes: `Sale deleted — due ৳${dueAmount} reversed`,
          createdById: ctx.userId,
        },
      });
    } else {
      const newDue = Math.max(0, math.sub(Number(cust.due), dueAmount));
      await tx.customer.update({
        where: { id: customerId },
        data: { due: newDue },
      });
    }
  },

  /** Check and apply Wallet/Advance payments. */
  async applyWalletTenders(
    tx: any,
    ctx: Ctx,
    saleId: string,
    customerId: string,
    tenders: Array<{ type: string; amount: any }>,
    isUpdate = false
  ): Promise<void> {
    const walletTenders = tenders.filter((t) => t.type === "Wallet");
    if (walletTenders.length === 0) return;

    const walletAmount = walletTenders.reduce((sum, t) => math.add(sum, t.amount), 0);
    if (walletAmount <= 0) return;

    const cust = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { balance: true, due: true },
    });
    const balanceVal = Number(cust.balance);
    const dueVal = Number(cust.due);
    const availableAdvance = Math.max(
      0,
      balanceVal,
      Math.abs(Math.min(0, dueVal)),
    );
    if (walletAmount > availableAdvance) {
      throw new ServiceError(
        "CONFLICT",
        `Insufficient wallet balance. Available: ${availableAdvance}, Requested: ${walletAmount}`,
        409,
      );
    }

    const newBalance = Math.max(0, math.sub(balanceVal, walletAmount));
    const remainingWallet = math.sub(walletAmount, balanceVal);
    let newDue = dueVal;
    if (remainingWallet > 0 && dueVal < 0) {
      newDue = math.add(dueVal, remainingWallet);
    }

    await tx.customer.update({
      where: { id: customerId },
      data: { balance: newBalance, due: newDue },
    });

    await tx.customerTransaction.create({
      data: {
        customerId: customerId,
        type: "PAYMENT",
        amount: walletAmount,
        balanceBefore: balanceVal,
        balanceAfter: newBalance,
        saleId,
        reference: `WALLET-${saleId.slice(0, 8).toUpperCase()}`,
        notes: isUpdate ? `Paid from wallet advance (order update)` : `Paid from wallet advance`,
        createdById: ctx.userId,
      },
    });
  },

  /** Restore Wallet/Advance payments. */
  async restoreWalletTenders(
    tx: any,
    ctx: Ctx,
    saleId: string,
    customerId: string,
    tenders: Array<{ type: string; amount: any }>,
    reason: string
  ): Promise<void> {
    const walletAmount = (tenders ?? [])
      .filter((t) => t.type === "WALLET" || t.type === "Wallet")
      .reduce((sum, t) => math.add(sum, Number(t.amount)), 0);

    if (walletAmount <= 0) return;

    const cust = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { balance: true },
    });

    const newBalance = math.add(Number(cust.balance), walletAmount);
    await tx.customer.update({
      where: { id: customerId },
      data: { balance: newBalance },
    });

    await tx.customerTransaction.create({
      data: {
        customerId,
        type: "WRITE_OFF",
        amount: walletAmount,
        balanceBefore: Number(cust.balance),
        balanceAfter: newBalance,
        saleId,
        reference: `VOID-${saleId.slice(0, 8).toUpperCase()}`,
        notes: `Wallet restored (sale voided: ${reason})`,
        createdById: ctx.userId,
      },
    });
  },

  /**
   * Apply customer balance changes on refund.
   *
   * ডিউ (বকেয়া) থেকে অটো-কাট করা হয় (যদি saleDue > 0)।
   * রিফান্ড পুরোটা হয় ক্যাশে ফেরত যায়, নয়তো ওয়ালেটে জমা হয়।
   */
  async applyRefundBalance(
    tx: any,
    ctx: Ctx,
    saleId: string,
    customerId: string,
    refundAmount: number,
    refundMethod?: string,
    saleDue: number = 0
  ): Promise<{ amountToDue: number; amountToWallet: number; amountToRefundCash: number }> {
    const cust = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { balance: true, due: true },
    });
    const currentBalance = Number(cust.balance);
    const currentDue = Number(cust.due);

    const amountToDue = Math.min(saleDue, refundAmount);
    const remainingRefund = refundAmount - amountToDue;

    let amountToWallet = 0;
    let amountToRefundCash = 0;
    
    // Route the remaining refund based on method
    const isWalletRefund = !refundMethod || refundMethod.toUpperCase() === "WALLET";
    if (isWalletRefund) {
      amountToWallet = remainingRefund;
    } else {
      amountToRefundCash = remainingRefund;
    }

    const newBalance = math.add(currentBalance, amountToWallet);
    const newDue = Math.max(0, math.sub(currentDue, amountToDue));

    // Update customer due and balance
    await tx.customer.update({
      where: { id: customerId },
      data: { 
        due: newDue,
        balance: newBalance
      },
    });

    if (amountToDue > 0) {
      await tx.customerTransaction.create({
        data: {
          customerId,
          type: "REFUND",
          amount: amountToDue,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          saleId,
          reference: `REFUND-DUE-${saleId.slice(0, 8).toUpperCase()}`,
          notes: `Refund offset outstanding due (৳${amountToDue})`,
          createdById: ctx.userId,
        },
      });
    }

    if (amountToWallet > 0) {
      await tx.customerTransaction.create({
        data: {
          customerId,
          type: "REFUND",
          amount: amountToWallet,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          saleId,
          reference: `REFUND-WLT-${saleId.slice(0, 8).toUpperCase()}`,
          notes: `Refund added to wallet (৳${amountToWallet})`,
          createdById: ctx.userId,
        },
      });
    }

    return { amountToDue, amountToWallet, amountToRefundCash };
  },

  /** Increment or decrement a customer's total spent and loyalty points */
  async recordCustomerSpent(
    tx: any,
    customerId: string,
    amount: number,
    isRevert = false
  ): Promise<void> {
    const change = isRevert ? -amount : amount;
    const pointsChange = Math.trunc(change / 100); // 1 point per 100 BDT (example)
    
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: change },
        loyaltyPoints: { increment: pointsChange }
      }
    });
  },

  /** Add funds to financial accounts when a sale is paid with cash/bank. */
  async applySaleTenders(
    tx: any,
    ctx: Ctx,
    saleId: string,
    tenders: Array<{ type: string; amount: any; accountId?: string | null }>,
    change: number = 0
  ): Promise<void> {
    const validTenders = tenders.filter(
      (t) => t.accountId && t.type !== "Due" && t.type !== "Wallet" && t.type !== "DUE" && t.type !== "WALLET"
    );
    let remainingChange = change;
    for (const t of validTenders) {
      let effectiveAmount = Number(t.amount);
      if (remainingChange > 0) {
        const toDeduct = Math.min(effectiveAmount, remainingChange);
        effectiveAmount -= toDeduct;
        remainingChange -= toDeduct;
      }
      if (effectiveAmount > 0) {
        await tx.financialAccount.update({
          where: { id: t.accountId },
          data: { balance: { increment: effectiveAmount } },
        });
      }
    }
  },

  /** Revert funds from financial accounts when a sale is voided/updated/deleted. */
  async revertSaleTenders(
    tx: any,
    ctx: Ctx,
    saleId: string,
    tenders: Array<{ type: string; amount: any; accountId?: string | null }>,
    change: number = 0
  ): Promise<void> {
    const validTenders = tenders.filter(
      (t) => t.accountId && t.type !== "Due" && t.type !== "Wallet" && t.type !== "DUE" && t.type !== "WALLET"
    );
    let remainingChange = change;
    for (const t of validTenders) {
      let effectiveAmount = Number(t.amount);
      if (remainingChange > 0) {
        const toDeduct = Math.min(effectiveAmount, remainingChange);
        effectiveAmount -= toDeduct;
        remainingChange -= toDeduct;
      }
      if (effectiveAmount > 0) {
        await tx.financialAccount.update({
          where: { id: t.accountId },
          data: { balance: { decrement: effectiveAmount } },
        });
      }
    }
  }
};
