/**
 * Supplier Ledger Service — double-entry accounting for supplier balances.
 *
 * Every financial event gets a `SupplierTransaction` record with `balanceBefore` / `balanceAfter`.
 * The supplier's `advanceBalance` is kept in sync inside Prisma interactive transactions.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import { authorize } from "@/server/lib/authorize";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SupplierTxType = "PURCHASE" | "PAYMENT" | "REFUND" | "ADJUSTMENT" | "WRITE_OFF";

export interface RecordSupplierTransactionInput {
  supplierId: string;
  type: SupplierTxType;
  amount: number;
  accountId?: string;
  purchaseId?: string;
  reference?: string;
  notes?: string;
}

export interface SupplierLedgerEntry {
  id: string;
  type: SupplierTxType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  purchaseId: string | null;
  accountId: string | null;
  createdById: string | null;
  createdAt: Date;
}

export interface PaginatedSupplierLedger {
  entries: SupplierLedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const supplierLedgerService = {
  /**
   * Get paginated transaction history for a supplier.
   */
  async getLedger(
    ctx: Ctx,
    supplierId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedSupplierLedger> {
    requireAtLeastViewer(ctx);

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }

    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      prisma.supplierTransaction.findMany({
        where: { supplierId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.supplierTransaction.count({
        where: { supplierId },
      }),
    ]);

    return {
      entries: entries.map((e: any) => ({
        id: e.id,
        type: e.type as SupplierTxType,
        amount: Number(e.amount),
        balanceBefore: Number(e.balanceBefore),
        balanceAfter: Number(e.balanceAfter),
        reference: e.reference,
        notes: e.notes,
        purchaseId: e.purchaseId,
        accountId: e.accountId,
        createdById: e.createdById,
        createdAt: e.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /**
   * Deposit advance money into supplier's wallet.
   * Increases `advanceBalance` — does NOT affect `payable`.
   * Decreases the financial account balance (money leaves our shop).
   */
  async depositAdvance(
    ctx: Ctx,
    supplierId: string,
    amount: number,
    accountId: string,
    reference?: string,
    notes?: string,
    date?: string | Date
  ) {
    authorize(ctx, ["ADMIN"]);
    const amt = Math.abs(amount);

    return prisma.$transaction(async (tx) => {
      const supp = await tx.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, advanceBalance: true },
      });
      if (!supp) throw new ServiceError("NOT_FOUND", "Supplier not found", 404);

      const currentBalance = Number(supp.advanceBalance);
      const newBalance = currentBalance + amt;

      await tx.supplier.update({
        where: { id: supplierId },
        data: { advanceBalance: newBalance },
      });

      // Update financial account (money out to supplier)
      if (accountId) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: amt } },
        });
      }

      const transaction = await tx.supplierTransaction.create({
        data: {
          type: "ADJUSTMENT",
          supplierId,
          amount: amt,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          accountId: accountId ?? null,
          reference: reference ?? null,
          notes: notes ?? `Advance deposit to supplier: ${amt}`,
          createdById: ctx.userId,
          ...(date ? { createdAt: new Date(date) } : {}),
        },
      });

      return { transaction, supplierId, newBalance };
    });
  },

  /**
   * Withdraw advance money from supplier's wallet (supplier refunds us).
   * Decreases `advanceBalance` — does NOT affect `payable`.
   * Increases the financial account balance (money comes back to our shop).
   */
  async withdrawAdvance(
    ctx: Ctx,
    supplierId: string,
    amount: number,
    accountId: string,
    reference?: string,
    notes?: string,
    date?: string | Date
  ) {
    authorize(ctx, ["ADMIN"]);
    const amt = Math.abs(amount);

    return prisma.$transaction(async (tx) => {
      const supp = await tx.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, advanceBalance: true },
      });
      if (!supp) throw new ServiceError("NOT_FOUND", "Supplier not found", 404);

      const currentBalance = Number(supp.advanceBalance);
      if (amt > currentBalance) {
        throw new ServiceError("CONFLICT", "Insufficient advance balance", 409);
      }
      const newBalance = currentBalance - amt;

      await tx.supplier.update({
        where: { id: supplierId },
        data: { advanceBalance: newBalance },
      });

      // Update financial account (money in from supplier)
      if (accountId) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { balance: { increment: amt } },
        });
      }

      return tx.supplierTransaction.create({
        data: {
          supplierId,
          type: "REFUND",
          amount: amt,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          accountId: accountId ?? null,
          reference: reference ?? null,
          notes: notes ?? `Advance refund from supplier: ${amt}`,
          createdById: ctx.userId,
          ...(date ? { createdAt: new Date(date) } : {}),
        },
      });
    });
  },
};

// ─── Internal helpers ───────────────────────────────────────────────────────

function requireAtLeastViewer(ctx: Ctx) {
  authorize(ctx, ["ADMIN", "CASHIER", "USER"]);
}
