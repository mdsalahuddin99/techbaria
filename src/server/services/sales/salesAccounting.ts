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
        select: { due: true, creditLimit: true },
      });
      let runningDue = Number(cust.due);

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
            balanceBefore: runningDue,
            balanceAfter: dueAfterRevert,
            saleId: sale.id,
            reference: `EDIT-${sale.id.slice(0, 8).toUpperCase()}`,
            notes: `Sale edited — old due ৳${oldDue} reversed`,
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
            balanceBefore: runningDue,
            balanceAfter: newDue,
            saleId: sale.id,
            reference: `EDIT-${sale.id.slice(0, 8).toUpperCase()}`,
            notes: `Sale edited — new due ৳${due}`,
            createdById: ctx.userId,
          },
        });
      }
    } else if (due > 0) {
      const cust = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { due: true, creditLimit: true },
      });
      const currentDue = Number(cust.due);
      const newDue = math.add(currentDue, due);
      const creditLimit = Number(cust.creditLimit);
 
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
          balanceBefore: currentDue,
          balanceAfter: newDue,
          saleId: sale.id,
          reference: `SALE-${sale.id.slice(0, 8).toUpperCase()}`,
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
      select: { due: true },
    });

    if (isDelete) {
      await tx.customer.update({
        where: { id: customerId },
        data: { due: { decrement: dueAmount } },
      });

      await tx.customerTransaction.create({
        data: {
          customerId: customerId,
          type: "ADJUSTMENT",
          amount: dueAmount,
          balanceBefore: 0,
          balanceAfter: 0,
          saleId,
          reference: `DELETE-${saleId.slice(0, 8).toUpperCase()}`,
          notes: "Sale deleted",
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

  /** Apply customer balance changes on refund. */
  async applyRefundBalance(
    tx: any,
    ctx: Ctx,
    saleId: string,
    customerId: string,
    refundAmount: number
  ): Promise<void> {
    const cust = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { balance: true },
    });
    const currentBalance = Number(cust.balance);
    const newBalance = math.add(currentBalance, refundAmount);

    await tx.customer.update({
      where: { id: customerId },
      data: { balance: newBalance },
    });

    await tx.customerTransaction.create({
      data: {
        customerId,
        type: "REFUND",
        amount: refundAmount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        saleId,
        reference: `REFUND-${saleId.slice(0, 8).toUpperCase()}`,
        createdById: ctx.userId,
      },
    });
  },

  /** Increment or decrement a customer's total spent and loyalty points */
  async recordCustomerSpent(
    tx: any,
    customerId: string,
    amount: number,
    isRevert = false
  ): Promise<void> {
    const change = isRevert ? -amount : amount;
    const pointsChange = Math.floor(change / 100); // 1 point per 100 BDT (example)
    
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: change },
        loyaltyPoints: { increment: pointsChange }
      }
    });
  }
};
