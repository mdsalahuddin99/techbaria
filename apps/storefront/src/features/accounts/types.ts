export type ShiftStatus = "Open" | "Closed";

export interface CashShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingCount?: number;
  expectedCash?: number;
  overShort?: number;
  /** Per-method sales totals during this shift (snapshot at close). */
  salesByMethod?: {
    Cash: number;
    Card: number;
    "Mobile Banking": number;
  };
  cashier: string;
  status: ShiftStatus;
}

// ---------- Financial accounts + ledger ----------

export type AccountType = "cash" | "bank" | "mobile_banking";

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile_banking: "Mobile Banking",
};

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  /** Optional parent ledger id — used to build a parent → sub-ledger tree
   *  within the same `type`. Top-level (parent) accounts have no parentId. */
  parentId?: string | null;
  /** Type-specific metadata. */
  details?: {
    bankName?: string;
    accountNumber?: string;
    branch?: string;
    provider?: string; // bKash, Nagad, Rocket, etc.
    walletNumber?: string;
  };
  /** Default account for its type — used for auto-routing. */
  isDefault?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export type LedgerCategory =
  | "opening"
  | "sale"
  | "sale_refund"
  | "due_collection"
  | "supplier_payment"
  | "purchase_payment"
  | "expense"
  | "transfer_in"
  | "transfer_out"
  | "deposit"
  | "withdraw"
  | "adjustment";

export type LedgerRefType =
  | "sale"
  | "return"
  | "purchase"
  | "supplier_payment"
  | "expense"
  | "transfer"
  | "manual"
  | "opening";

export interface LedgerTransaction {
  id: string;
  accountId: string;
  date: string;
  direction: "in" | "out";
  amount: number;
  category: LedgerCategory;
  refType?: LedgerRefType;
  refId?: string;
  /** For transfers — the other side's account id. */
  counterAccountId?: string;
  note?: string;
  /** Snapshot of the account balance immediately after this entry. */
  balanceAfter: number;
  createdBy: string;
}
