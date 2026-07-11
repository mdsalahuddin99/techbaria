import type { FinancialAccount } from "./types";

export interface AccountTreeNode {
  account: FinancialAccount;
  depth: number;
  /** Parent-prefixed label, e.g. "DBBL · Branch A". */
  displayName: string;
}

/**
 * Flatten accounts into a parent → children order with depth + a
 * pretty display name. Children appear directly after their parent.
 * Cycles and orphan parentIds are tolerated.
 */
export function flattenAccountTree(accounts: FinancialAccount[]): AccountTreeNode[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const childrenOf = new Map<string | null, FinancialAccount[]>();
  for (const a of accounts) {
    const key = a.parentId && byId.has(a.parentId) ? a.parentId : null;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(a);
  }
  const out: AccountTreeNode[] = [];
  const visit = (parentId: string | null, depth: number, parentLabel: string) => {
    const list = childrenOf.get(parentId) ?? [];
    for (const a of list) {
      const displayName = depth === 0 ? a.name : `${parentLabel} · ${a.name}`;
      out.push({ account: a, depth, displayName });
      visit(a.id, depth + 1, displayName);
    }
  };
  visit(null, 0, "");
  return out;
}

/**
 * Indented label for use inside `<SelectItem>` — keeps the same string
 * everywhere so the trigger value matches what users picked.
 */
export function accountSelectLabel(node: AccountTreeNode): string {
  const indent = node.depth > 0 ? "↳ ".padStart(node.depth * 2 + 2) : "";
  return `${indent}${node.account.name}`;
}

/** Flatten the tree per `type` so cash/bank/mobile groups stay contiguous. */
export function flattenAccountsGroupedByType(accounts: FinancialAccount[]): AccountTreeNode[] {
  const order: Array<FinancialAccount["type"]> = ["cash", "bank", "mobile_banking"];
  const out: AccountTreeNode[] = [];
  for (const t of order) {
    out.push(...flattenAccountTree(accounts.filter((a) => a.type === t)));
  }
  return out;
}
