import type { FinancialAccount, LedgerTransaction } from "./types";

/**
 * Compute the current balance of a financial account based on its
 * opening balance and all ledger entries.
 */
export function computeBalance(
  ledger: LedgerTransaction[],
  account: FinancialAccount,
): number {
  const entries = ledger.filter((e) => e.accountId === account.id);
  let bal = account.openingBalance;
  for (const e of entries) {
    bal += e.direction === "in" ? e.amount : -e.amount;
  }
  return bal;
}
