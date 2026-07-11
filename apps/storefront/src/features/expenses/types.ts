export type ExpenseCategory =
  | "Rent"
  | "Salary"
  | "Utilities"
  | "Transport"
  | "Marketing"
  | "Maintenance"
  | "Other";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  /** Account the cash went out of. */
  accountId?: string;
  recordedBy: string;
}
