import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";

export const salesAccounting = {
  /** Validate customer and financial accounts belong to the current shop. */
  async validateCustomerAndAccounts(
    ctx: Ctx,
    customerId?: string,
    tenders?: Array<{ accountId?: string }>
  ): Promise<void> {
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, shopId: ctx.shopId },
        select: { id: true },
      });
      if (!customer) {
        throw new ServiceError("NOT_FOUND", "Customer not found", 404);
      }
    }

    const accountIds = (tenders ?? [])
      .map((t) => t.accountId)
      .filter((id): id is string => !!id);
    if (accountIds.length > 0) {
      const accounts = await prisma.financialAccount.findMany({
        where: { id: { in: accountIds }, shopId: ctx.shopId },
        select: { id: true },
      });
      if (accounts.length !== new Set(accountIds).size) {
        throw new ServiceError("VALIDATION", "Invalid or unauthorized financial account", 400);
      }
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
      // Revert old due first
      if (oldDue > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: { due: { decrement: oldDue } },
        });
      }
      // Apply new due
      if (due > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: { due: { increment: due } },
        });
      }
    } else if (due > 0) {
      const cust = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { due: true, creditLimit: true },
      });
      const currentDue = Number(cust.due);
      const newDue = currentDue + due;
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
          shopId: ctx.shopId,
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
          shopId: ctx.shopId,
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
      const newDue = Math.max(0, Number(cust.due) - dueAmount);
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

    const walletAmount = walletTenders.reduce((sum, t) => sum + t.amount, 0);
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

    const newBalance = Math.max(0, balanceVal - walletAmount);
    const remainingWallet = walletAmount - balanceVal;
    let newDue = dueVal;
    if (remainingWallet > 0 && dueVal < 0) {
      newDue = dueVal + remainingWallet;
    }

    await tx.customer.update({
      where: { id: customerId },
      data: { balance: newBalance, due: newDue },
    });

    await tx.customerTransaction.create({
      data: {
        shopId: ctx.shopId,
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
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (walletAmount <= 0) return;

    const cust = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { balance: true },
    });

    const newBalance = Number(cust.balance) + walletAmount;
    await tx.customer.update({
      where: { id: customerId },
      data: { balance: newBalance },
    });

    await tx.customerTransaction.create({
      data: {
        shopId: ctx.shopId,
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
    const newBalance = currentBalance + refundAmount;

    await tx.customer.update({
      where: { id: customerId },
      data: { balance: newBalance },
    });

    await tx.customerTransaction.create({
      data: {
        shopId: ctx.shopId,
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
  }
};
