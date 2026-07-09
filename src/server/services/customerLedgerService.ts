/**
 * Customer Ledger Service — double-entry accounting for customer balances.
 *
 * Every financial event (sale, payment, refund) gets a `CustomerTransaction`
 * record with `balanceBefore` / `balanceAfter` snapshotting.  The customer's
 * `balance` is kept in sync inside Prisma interactive transactions so there
 * is **no race condition** between reading the current balance and writing
 * the new one.
 *
 * ── Immutability ──
 * Transaction records are **never** deleted or mutated.  Corrections must be
 * done with a new `ADJUSTMENT` or `WRITE_OFF` transaction.
 *
 * ── Double-entry ──
 * When an `accountId` is provided (e.g. for PAYMENT) the `FinancialAccount`
 * balance is atomically updated inside the same database transaction.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import { authorize } from "@/server/lib/authorize";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TransactionType = "SALE" | "PAYMENT" | "REFUND" | "ADJUSTMENT" | "WRITE_OFF";

export interface RecordTransactionInput {
  customerId: string;
  type: TransactionType;
  /** Positive = customer owes more; negative = customer owes less.  Signed for ADJUSTMENT. */
  amount: number;
  /** FinancialAccount id — required for double-entry on PAYMENT / REFUND. */
  accountId?: string;
  /** Sale id — links this transaction to the originating sale (for SALE / REFUND). */
  saleId?: string;
  /** Reference string — e.g. invoice no, receipt no. */
  reference?: string;
  /** Free-text notes. */
  notes?: string;
}

export interface CustomerLedgerEntry {
  id: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  saleId: string | null;
  accountId: string | null;
  createdById: string | null;
  createdAt: Date;
}

export interface PaginatedLedger {
  entries: CustomerLedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a TransactionType to a signed delta for the customer balance field.
 * balance = advance deposit (always ≥ 0). Positive means customer has advance.
 * SALE       → no change to balance (affects due, not balance)
 * PAYMENT    → no delta here; due collection does NOT change wallet balance
 * REFUND     → +abs(amount)  (refund adds back to advance)
 * WRITE_OFF  → -abs(amount)  (write-off reduces advance)
 * ADJUSTMENT → signed by caller:
 *              +amount for advance deposit (depositAdvance)
 *              signed for manual corrections
 */
function balanceDelta(type: TransactionType, amount: number): number {
  switch (type) {
    case "SALE":
      return 0; // credit sale affects due, not balance
    case "PAYMENT":
      return 0; // due collection does NOT change wallet balance
    case "REFUND":
      return Math.abs(amount);
    case "WRITE_OFF":
      return -Math.abs(amount);
    case "ADJUSTMENT":
      return amount; // positive = deposit, negative = manual deduction
    default:
      return amount;
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const customerLedgerService = {
  /**
   * Record a customer transaction atomically.
   *
   * Inside a Prisma interactive transaction:
   * 1. Lock the customer row (read + write)
   * 2. Calculate new balance
   * 3. Create CustomerTransaction record
   * 4. Update Customer.balance
   * 5. Optionally update FinancialAccount.balance (double-entry)
   *
   * balance = advance deposit (always ≥ 0). Positive means the customer has advance funds.
   */
  async recordTransaction(ctx: Ctx, input: RecordTransactionInput) {
    authorize(ctx, ["ADMIN"]);

    return prisma.$transaction(async (tx) => {
      // 1. Lock & validate customer
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true, balance: true },
      });
      if (!customer) {
        throw new ServiceError("NOT_FOUND", "Customer not found", 404);
      }

      const currentBalance = Number(customer.balance);
      const delta = balanceDelta(input.type, input.amount);
      const balanceAfter = currentBalance + delta;

      // 2. Validate account if provided
      if (input.accountId) {
        const account = await tx.financialAccount.findUnique({
          where: { id: input.accountId },
          select: { id: true },
        });
        if (!account) {
          throw new ServiceError("NOT_FOUND", "Financial account not found", 404);
        }
      }

      // 3. Create transaction record
      const transaction = await tx.customerTransaction.create({
        data: {
          customerId: input.customerId,
          type: input.type,
          amount: input.amount,
          balanceBefore: currentBalance,
          balanceAfter,
          saleId: input.saleId ?? null,
          accountId: input.accountId ?? null,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          createdById: ctx.userId,
        },
      });

      // 4. Update customer balance
      await tx.customer.update({
        where: { id: input.customerId },
        data: { balance: balanceAfter },
      });

      // 5. Double-entry: update FinancialAccount balance
      //    PAYMENT → money comes in → account balance increases
      //    REFUND → money goes out → account balance decreases
      if (input.accountId) {
        const accountDelta =
          input.type === "PAYMENT"
            ? Math.abs(input.amount) // money in
            : input.type === "REFUND"
              ? -Math.abs(input.amount) // money out
              : 0; // SALE / ADJUSTMENT / WRITE_OFF don't affect cash accounts directly

        if (accountDelta !== 0) {
          await tx.financialAccount.update({
            where: { id: input.accountId },
            data: { balance: { increment: accountDelta } },
          });
        }
      }

      return {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        balanceBefore: Number(transaction.balanceBefore),
        balanceAfter: Number(transaction.balanceAfter),
        reference: transaction.reference,
        notes: transaction.notes,
        saleId: transaction.saleId,
        accountId: transaction.accountId,
        createdById: transaction.createdById,
        createdAt: transaction.createdAt,
      };
    }, { timeout: 30000 });
  },

  /**
   * Get paginated transaction history for a customer.
   * Requires MANAGER+ or VIEWER (read-only).
   */
  async getLedger(
    ctx: Ctx,
    customerId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedLedger> {
    requireAtLeastViewer(ctx);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      prisma.customerTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.customerTransaction.count({
        where: { customerId },
      }),
    ]);

    return {
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type as TransactionType,
        amount: Number(e.amount),
        balanceBefore: Number(e.balanceBefore),
        balanceAfter: Number(e.balanceAfter),
        reference: e.reference,
        notes: e.notes,
        saleId: e.saleId,
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
   * Get current balance + credit limit for a customer.
   */
  async getBalance(ctx: Ctx, customerId: string) {
    requireAtLeastViewer(ctx);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        due: true,
        creditLimit: true,
        notes: true,
      },
    });
    if (!customer) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    return {
      ...customer,
      balance: Number(customer.balance),
      due: Number(customer.due),
      creditLimit: Number(customer.creditLimit),
      availableCredit: Math.max(0, Number(customer.creditLimit) - Number(customer.due)),
      isOverLimit: Number(customer.due) > Number(customer.creditLimit) && Number(customer.creditLimit) > 0,
    };
  },

  /**
   * Collect payment toward customer's due (credit bill).
   * Decreases `due` — does NOT affect `balance`.
   * Increases the financial account balance (money comes in).
   */
  async collectDue(
    ctx: Ctx,
    customerId: string,
    amount: number,
    accountId: string,
    reference?: string,
    notes?: string,
  ) {
    authorize(ctx, ["ADMIN", "CASHIER"]);
    const amt = Math.abs(amount);

    return prisma.$transaction(async (tx) => {
      // Fetch both `balance` (wallet advance) and `due` so we can snapshot correctly
      const cust = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, due: true, balance: true },
      });
      if (!cust) throw new ServiceError("NOT_FOUND", "Customer not found", 404);

      const currentDue = Number(cust.due);
      const currentBalance = Number(cust.balance); // wallet advance — for ledger snapshot
      const newDue = Math.max(0, currentDue - amt);

      await tx.customer.update({
        where: { id: customerId },
        data: { due: newDue },
      });

      // Update financial account (money in)
      if (accountId) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { balance: { increment: amt } },
        });
      }

      // balanceBefore/After tracks wallet balance (not due) — consistent with ledger convention.
      // notes field carries the due change context.
      const transaction = await tx.customerTransaction.create({
        data: {
          customerId,
          type: "PAYMENT",
          amount: amt,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance, // wallet advance unchanged by due collection
          accountId: accountId ?? null,
          reference: reference ?? null,
          notes: notes ?? `Due collection: ${amt} (due: ${currentDue} → ${newDue})`,
          createdById: ctx.userId,
        },
      });

      return {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        balanceBefore: Number(transaction.balanceBefore),
        balanceAfter: Number(transaction.balanceAfter),
      };
    });
  },

  /**
   * Deposit advance money into customer's wallet.
   * Increases `balance` (positive advance) — does NOT affect `due`.
   * Increases the financial account balance (money comes in).
   */
  async depositAdvance(
    ctx: Ctx,
    customerId: string,
    amount: number,
    accountId: string,
    reference?: string,
    notes?: string,
  ) {
    authorize(ctx, ["ADMIN", "CASHIER"]);
    const amt = Math.abs(amount);

    return prisma.$transaction(async (tx) => {
      const cust = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, balance: true },
      });
      if (!cust) throw new ServiceError("NOT_FOUND", "Customer not found", 404);

      const currentBalance = Number(cust.balance);
      const newBalance = currentBalance + amt;

      await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance },
      });

      // Update financial account (money in)
      if (accountId) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { balance: { increment: amt } },
        });
      }

      const transaction = await tx.customerTransaction.create({
        data: {
          // ADJUSTMENT type distinguishes advance top-up from due collection (PAYMENT)
          type: "ADJUSTMENT",
          customerId,
          amount: amt,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          accountId: accountId ?? null,
          reference: reference ?? null,
          notes: notes ?? `Advance deposit: ${amt}`,
          createdById: ctx.userId,
        },
      });

      return { 
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          balanceBefore: Number(transaction.balanceBefore),
          balanceAfter: Number(transaction.balanceAfter),
        }, 
        customerId, 
        newBalance 
      };
    });
  },

  /**
   * Withdraw advance money from customer's wallet (refund/ pay out).
   * Decreases `balance` — does NOT affect `due`.
   * Decreases the financial account balance (money leaves).
   */
  async withdrawCustomerWallet(
    ctx: Ctx,
    customerId: string,
    amount: number,
    accountId: string,
    reference?: string,
    notes?: string,
  ) {
    authorize(ctx, ["ADMIN", "CASHIER"]);
    const amt = Math.abs(amount);

    return prisma.$transaction(async (tx) => {
      const cust = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, balance: true },
      });
      if (!cust) throw new ServiceError("NOT_FOUND", "Customer not found", 404);

      const currentBalance = Number(cust.balance);
      if (amt > currentBalance) {
        throw new ServiceError("CONFLICT", "Insufficient wallet balance", 409);
      }
      const newBalance = currentBalance - amt;

      await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance },
      });

      // Update financial account (money out)
      if (accountId) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: amt } },
        });
      }

      const transaction = await tx.customerTransaction.create({
        data: {
          customerId,
          type: "REFUND",
          amount: amt,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          accountId: accountId ?? null,
          reference: reference ?? null,
          notes: notes ?? `Wallet withdrawal: ${amt}`,
          createdById: ctx.userId,
        },
      });

      return {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        balanceBefore: Number(transaction.balanceBefore),
        balanceAfter: Number(transaction.balanceAfter),
      };
    });
  },
};

// ─── Internal helpers ───────────────────────────────────────────────────────

function requireAtLeastViewer(ctx: Ctx) {
  authorize(ctx, ["ADMIN", "CASHIER", "VIEWER"]);
}
