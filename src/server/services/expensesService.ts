/**
 * Expenses service — Prisma-backed, framework-agnostic.
 *
 * Scoped by `ctx.shopId` (multi-tenant).
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";

export interface ExpenseCreateInput {
  category: string;
  amount: number;
  accountId?: string;
  description?: string;
  date?: string;
}

export interface ExpenseUpdateInput {
  category?: string;
  amount?: number;
  accountId?: string | null;
  description?: string;
  date?: string;
}

export const expensesService = {
  /** List all expenses for the shop (paginated). */
  async list(ctx: Ctx, params?: PaginationParams) {
    const raw = await paginate<any>(
      prisma.expense,
      { include: { account: { select: { name: true } } } },
      params,
      { orderBy: { date: "desc" as const } },
    );

    return {
      ...raw,
      items: raw.items.map((e: any) => ({
        id: e.id,
        date: e.date.toISOString(),
        category: e.category,
        amount: Number(e.amount),
        description: e.notes || "",
        accountId: e.accountId || undefined,
        recordedBy: "Admin",
      })),
    };
  },

  /** Get single expense. */
  async getById(ctx: Ctx, id: string) {
    const e = await prisma.expense.findFirst({
      where: { id },
    });

    if (!e) throw new ServiceError("NOT_FOUND", "Expense not found", 404);

    return {
      id: e.id,
      date: e.date.toISOString(),
      category: e.category,
      amount: Number(e.amount),
      description: e.notes || "",
      accountId: e.accountId || undefined,
      recordedBy: "Admin",
    };
  },

  /** Create a new expense. Requires MANAGER+. */
  async create(ctx: Ctx, input: ExpenseCreateInput) {
    requireRole(ctx, "ADMIN");

    if (input.amount <= 0) {
      throw new ServiceError("VALIDATION", "Amount must be positive", 400);
    }

    return prisma.$transaction(async (tx) => {
      // 1. If account is provided, verify it exists and has sufficient balance
      if (input.accountId) {
        const account = await tx.financialAccount.findFirst({
          where: { id: input.accountId },
        });
        if (!account) {
          throw new ServiceError("NOT_FOUND", "Account not found", 404);
        }
        if (Number(account.balance) < input.amount) {
          throw new ServiceError("VALIDATION", "Insufficient balance in account", 400);
        }

        // Decrement balance
        await tx.financialAccount.update({
          where: { id: input.accountId },
          data: { balance: { decrement: input.amount } },
        });
      }

      // 2. Create the expense
      const expense = await tx.expense.create({
        data: {
          category: input.category,
          amount: input.amount,
          accountId: input.accountId || null,
          notes: input.description || null,
          date: input.date ? new Date(input.date) : new Date(),
        },
      });

      await auditLogService.log(ctx, {
        entity: "Expense",
        entityId: expense.id,
        action: "CREATE",
        diff: { category: input.category, amount: input.amount },
      });

      return {
        id: expense.id,
        date: expense.date.toISOString(),
        category: expense.category,
        amount: Number(expense.amount),
        description: expense.notes || "",
        accountId: expense.accountId || undefined,
        recordedBy: "Admin",
      };
    });
  },

  /** Update an expense. Requires MANAGER+. */
  async update(ctx: Ctx, id: string, input: ExpenseUpdateInput) {
    requireRole(ctx, "ADMIN");

    return prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id },
      });
      if (!existing) {
        throw new ServiceError("NOT_FOUND", "Expense not found", 404);
      }

      const newAmount = input.amount !== undefined ? input.amount : Number(existing.amount);
      const newAccountId = input.accountId !== undefined ? input.accountId : existing.accountId;

      // Handle balance updates if account or amount changes
      if (existing.accountId !== newAccountId || Number(existing.amount) !== newAmount) {
        // Revert old account balance
        if (existing.accountId) {
          await tx.financialAccount.update({
            where: { id: existing.accountId },
            data: { balance: { increment: Number(existing.amount) } },
          });
        }

        // Apply new account balance
        if (newAccountId) {
          const account = await tx.financialAccount.findFirst({
            where: { id: newAccountId },
          });
          if (!account) {
            throw new ServiceError("NOT_FOUND", "New account not found", 404);
          }
          if (Number(account.balance) < newAmount) {
            throw new ServiceError("VALIDATION", "Insufficient balance in new account", 400);
          }

          await tx.financialAccount.update({
            where: { id: newAccountId },
            data: { balance: { decrement: newAmount } },
          });
        }
      }

      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(input.category !== undefined && { category: input.category }),
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.accountId !== undefined && { accountId: input.accountId }),
          ...(input.description !== undefined && { notes: input.description }),
          ...(input.date !== undefined && { date: new Date(input.date) }),
        },
      });

      return {
        id: updated.id,
        date: updated.date.toISOString(),
        category: updated.category,
        amount: Number(updated.amount),
        description: updated.notes || "",
        recordedBy: "Admin",
      };
    });
  },

  /** Delete an expense. Requires MANAGER+. */
  async remove(ctx: Ctx, id: string) {
    requireRole(ctx, "ADMIN");

    return prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id },
      });
      if (!existing) {
        throw new ServiceError("NOT_FOUND", "Expense not found", 404);
      }

      // Revert account balance
      if (existing.accountId) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: Number(existing.amount) } },
        });
      }

      await tx.expense.delete({
        where: { id },
      });
    });
  },
};
