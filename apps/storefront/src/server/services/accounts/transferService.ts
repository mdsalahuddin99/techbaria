// src/server/services/accounts/transferService.ts

import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";

/**
 * Service responsible for account transfers, deposits, and withdrawals.
 */
export const transferService = {
  /** Transfer funds between two accounts. */
  async transfer(ctx: Ctx, input: { fromAccountId: string; toAccountId: string; amount: number; notes?: string }) {
    if (input.fromAccountId === input.toAccountId) {
      throw new ServiceError("VALIDATION", "Source and destination accounts must differ", 400);
    }
    if (input.amount <= 0) {
      throw new ServiceError("VALIDATION", "Amount must be positive", 400);
    }

    return prisma.$transaction(async (tx) => {
      const fromAcc = await tx.financialAccount.findFirst({
        where: { id: input.fromAccountId },
      });
      const toAcc = await tx.financialAccount.findFirst({
        where: { id: input.toAccountId },
      });

      if (!fromAcc || !toAcc) {
        throw new ServiceError("NOT_FOUND", "One or both accounts not found", 404);
      }

      if (Number(fromAcc.balance) < input.amount) {
        throw new ServiceError("VALIDATION", "Insufficient balance in source account", 400);
      }

      // Deduct from source
      await tx.financialAccount.update({
        where: { id: input.fromAccountId },
        data: { balance: { decrement: input.amount } },
      });

      // Add to destination
      await tx.financialAccount.update({
        where: { id: input.toAccountId },
        data: { balance: { increment: input.amount } },
      });

      // Record transfer
      await tx.accountTransfer.create({
        data: {
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          notes: input.notes,
        },
      });
    });
  },

  /** Record manual deposit or withdraw. */
  async depositOrWithdraw(ctx: Ctx, input: { accountId: string; direction: "in" | "out"; amount: number; note?: string }) {
    if (input.amount <= 0) {
      throw new ServiceError("VALIDATION", "Amount must be positive", 400);
    }

    return prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findFirst({
        where: { id: input.accountId },
      });

      if (!account) {
        throw new ServiceError("NOT_FOUND", "Account not found", 404);
      }

      if (input.direction === "out" && Number(account.balance) < input.amount) {
        throw new ServiceError("VALIDATION", "Insufficient balance", 400);
      }

      const balanceChange = input.direction === "in" ? input.amount : -input.amount;

      await tx.financialAccount.update({
        where: { id: input.accountId },
        data: { balance: { increment: balanceChange } },
      });

      // Since there's no manual transaction table, we record it as a system audit log
      await tx.auditLog.create({
        data: {
          userId: ctx.userId,
          entity: "FinancialAccount",
          entityId: input.accountId,
          action: input.direction === "in" ? "DEPOSIT" : "WITHDRAW",
          diff: {
            amount: input.amount,
            notes: input.note,
            prevBalance: Number(account.balance),
            nextBalance: Number(account.balance) + balanceChange,
          },
        },
      });
    });
  },
};
