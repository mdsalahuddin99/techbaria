// src/server/services/accounts/ledgerService.ts

import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import type { LedgerTransaction } from "@/features/accounts/types";

/**
 * Service responsible for assembling the ledger view for a shop.
 * This logic was previously embedded in `accountsService.listLedger`.
 * It is now extracted to keep `accountsService` thin and focused on the façade.
 */
export const ledgerService = {
  /**
   * List ledger transactions for the shop, sorted newest‑first with running balances.
   */
  async listLedger(ctx: Ctx): Promise<LedgerTransaction[]> {
    // 1. Fetch all financial accounts for the shop
    const accounts = await prisma.financialAccount.findMany();
    const accountIds = accounts.map((a) => a.id);

    // 2. Fetch related data sources
    const [transfers, expenses, supplierPayments, saleTenders, purchaseTenders, customerWalletTxs, supplierWalletTxs, auditLogs] =
      await Promise.all([
        prisma.accountTransfer.findMany({
          orderBy: { date: "asc" },
        }),
        prisma.expense.findMany({
          where: { accountId: { in: accountIds } },
          orderBy: { date: "asc" },
        }),
        prisma.supplierPayment.findMany({
          where: { accountId: { in: accountIds } },
          orderBy: { date: "asc" },
        }),
        prisma.saleTender.findMany({
          where: { accountId: { in: accountIds } },
          include: { sale: { select: { createdAt: true } } },
        }),
        prisma.purchaseTender.findMany({
          where: { accountId: { in: accountIds } },
          include: { purchase: { select: { createdAt: true } } },
        }),
        prisma.customerTransaction.findMany({
          where: {
            accountId: { in: accountIds },
          },
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.supplierTransaction.findMany({
          where: {
            accountId: { in: accountIds },
          },
          include: { supplier: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.auditLog.findMany({
          where: {
            entity: "FinancialAccount",
            action: { in: ["DEPOSIT", "WITHDRAW"] },
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    // 3. Transform everything into a flat list of LedgerTransaction entries
    const txs: Omit<LedgerTransaction, "balanceAfter">[] = [];

    // Transfers – create paired out/in entries
    for (const t of transfers) {
      txs.push({
        id: `${t.id}-out`,
        accountId: t.fromAccountId,
        date: t.date.toISOString(),
        direction: "out",
        amount: Number(t.amount),
        category: "transfer_out",
        refType: "transfer",
        refId: t.id,
        counterAccountId: t.toAccountId,
        note: t.notes || undefined,
        createdBy: "System",
      });
      txs.push({
        id: `${t.id}-in`,
        accountId: t.toAccountId,
        date: t.date.toISOString(),
        direction: "in",
        amount: Number(t.amount),
        category: "transfer_in",
        refType: "transfer",
        refId: t.id,
        counterAccountId: t.fromAccountId,
        note: t.notes || undefined,
        createdBy: "System",
      });
    }

    // Expenses
    for (const e of expenses) {
      if (!e.accountId) continue;
      txs.push({
        id: e.id,
        accountId: e.accountId,
        date: e.date.toISOString(),
        direction: "out",
        amount: Number(e.amount),
        category: "expense",
        refType: "expense",
        refId: e.id,
        note: e.notes || undefined,
        createdBy: "System",
      });
    }

    // Supplier payments
    for (const sp of supplierPayments) {
      if (!sp.accountId) continue;
      txs.push({
        id: sp.id,
        accountId: sp.accountId,
        date: sp.date.toISOString(),
        direction: "out",
        amount: Number(sp.amount),
        category: "supplier_payment",
        refType: "supplier_payment",
        refId: sp.id,
        note: sp.notes || undefined,
        createdBy: "System",
      });
    }

    // Sale tenders – money coming into the shop
    for (const st of saleTenders) {
      if (!st.accountId) continue;
      txs.push({
        id: st.id,
        accountId: st.accountId,
        date: st.sale.createdAt.toISOString(),
        direction: "in",
        amount: Number(st.amount),
        category: "sale",
        refType: "sale",
        refId: st.saleId,
        createdBy: "System",
      });
    }

    // Purchase tenders – money leaving the shop
    for (const pt of purchaseTenders) {
      if (!pt.accountId) continue;
      txs.push({
        id: pt.id,
        accountId: pt.accountId,
        date: pt.purchase.createdAt.toISOString(),
        direction: "out",
        amount: Number(pt.amount),
        category: "purchase_payment",
        refType: "purchase",
        refId: pt.purchaseId,
        createdBy: "System",
      });
    }

    // Customer wallet transactions (PAYMENT/ADJUSTMENT = in, REFUND = out)
    for (const ct of customerWalletTxs) {
      const isMoneyIn = ct.type === "PAYMENT" || ct.type === "ADJUSTMENT";
      txs.push({
        id: ct.id,
        accountId: ct.accountId!,
        date: ct.createdAt.toISOString(),
        direction: isMoneyIn ? "in" : "out",
        amount: Number(ct.amount),
        category: ct.type === "PAYMENT" ? "due_collection" : (isMoneyIn ? "deposit" : "withdraw"),
        refType: "manual",
        refId: ct.id,
        note:
          ct.notes ||
          `Customer wallet transaction — ${ct.customer?.name ?? "unknown"}`,
        createdBy: "System",
      });
    }

    // Supplier wallet transactions (REFUND = in, ADJUSTMENT/PAYMENT = out)
    for (const st of supplierWalletTxs) {
      const isMoneyIn = st.type === "REFUND";
      txs.push({
        id: st.id,
        accountId: st.accountId!,
        date: st.createdAt.toISOString(),
        direction: isMoneyIn ? "in" : "out",
        amount: Number(st.amount),
        category: isMoneyIn ? "deposit" : "withdraw",
        refType: "manual",
        refId: st.id,
        note:
          st.notes ||
          `Supplier wallet transaction — ${st.supplier?.name ?? "unknown"}`,
        createdBy: "System",
      });
    }

    // Manual deposit/withdraw entries from audit logs
    for (const al of auditLogs) {
      const diffObj = (al.diff || {}) as any;
      const isDeposit = al.action === "DEPOSIT";
      txs.push({
        id: al.id,
        accountId: al.entityId,
        date: al.createdAt.toISOString(),
        direction: isDeposit ? "in" : "out",
        amount: Number(diffObj.amount) || 0,
        category: isDeposit ? "deposit" : "withdraw",
        refType: "manual",
        refId: al.id,
        note: diffObj.notes || undefined,
        createdBy: "Admin",
      });
    }

    // 4. Sort chronologically and compute running balances
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const balances = new Map<string, number>();
    accounts.forEach((a) => balances.set(a.id, Number(a.openingBalance)));

    const ledger: LedgerTransaction[] = [];
    for (const tx of txs) {
      const cur = balances.get(tx.accountId) ?? 0;
      const next = cur + (tx.direction === "in" ? tx.amount : -tx.amount);
      balances.set(tx.accountId, next);
      ledger.push({ ...tx, balanceAfter: next });
    }

    // Return newest‑first as per original implementation
    return ledger.reverse();
  },
};
