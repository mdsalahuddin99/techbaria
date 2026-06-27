import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AccountType,
  FinancialAccount,
  LedgerTransaction,
} from "./types";
import { computeBalance } from "./utils";
import { accountKeys, ledgerKeys } from "./queryKeys";
import { productKeys } from "@/features/products/queryKeys";
import { customerKeys } from "@/features/customers/queryKeys";
import { supplierKeys } from "@/features/suppliers/queryKeys";
import { saleKeys } from "@/features/sales/queryKeys";
import { accountsService } from "@/services";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

// ---------- Primary queries ----------

/**
 * Primary accounts-list query. The `useAccountsCacheBridge` (mounted in
 * AppProviders) seeds and updates this cache from Zustand during the
 * local-driver phase, so reads are reactive without manual invalidation.
 */
export function useAccountsQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: () => accountsService.list(),
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.MASTER_DATA,
  });
}

export function useLedgerQuery(accountId?: string, initialData?: any) {
  const { session, status } = useAuth();
  const { data: all } = useQuery({
    queryKey: ledgerKeys.list(),
    queryFn: () => accountsService.listLedger(),
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.MASTER_DATA,
  });
  return useMemo(
    () => (accountId ? (all ?? []).filter((t: any) => t.accountId === accountId) : (all ?? [])),
    [all, accountId],
  );
}

// ---------- Backward-compat hooks (now backed by the cache) ----------

export function useAccounts(initialData?: FinancialAccount[]): FinancialAccount[] {
  const { data } = useAccountsQuery(
    initialData ? { items: initialData, total: initialData.length } : undefined
  );
  return ((data as any)?.items ?? []) as FinancialAccount[];
}

export function useActiveAccounts(initialData?: FinancialAccount[]): FinancialAccount[] {
  const accounts = useAccounts(initialData);
  return useMemo(() => accounts.filter((a) => !a.isArchived), [accounts]);
}

export function useAccountsByType(type: AccountType) {
  const accounts = useActiveAccounts();
  return useMemo(() => accounts.filter((a) => a.type === type), [accounts, type]);
}

export function useLedger(accountId?: string, initialData?: LedgerTransaction[]): LedgerTransaction[] {
  return useLedgerQuery(accountId, initialData);
}

/** Live balance per account derived from opening + ledger. */
export function useAccountBalances(initialAccounts?: FinancialAccount[], initialLedger?: LedgerTransaction[]): Record<string, number> {
  const accounts = useAccounts(initialAccounts);
  const ledger = useLedger(undefined, initialLedger);
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of accounts) map[a.id] = computeBalance(ledger, a);
    return map;
  }, [accounts, ledger]);
}

export function useAccountsByTypeTotals(initialAccounts?: FinancialAccount[], initialLedger?: LedgerTransaction[]) {
  const accounts = useActiveAccounts(initialAccounts);
  const balances = useAccountBalances(initialAccounts, initialLedger);
  return useMemo(() => {
    const totals: Record<AccountType, number> = {
      cash: 0,
      bank: 0,
      mobile_banking: 0,
    };
    for (const a of accounts) totals[a.type] += balances[a.id] ?? 0;
    return totals;
  }, [accounts, balances]);
}

// ---------- Mutations ----------

/**
 * Invalidate every cache that could be affected by an accounts/ledger
 * change. Ledger entries are appended by sales settlement, refunds,
 * supplier payments, expenses, due collection, transfers, etc. — so
 * touching one of those flows from elsewhere may need accounts to
 * refresh, and vice versa. We invalidate liberally; the bridge keeps
 * actual reads cheap.
 */
function invalidateAccountAdjacent(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: accountKeys.all });
  qc.invalidateQueries({ queryKey: ledgerKeys.all });
}

function invalidateLedgerSideEffects(qc: ReturnType<typeof useQueryClient>) {
  // Sales settlement, refunds, supplier payment, due collection all
  // touch other features' caches. Cheap broad invalidation here keeps
  // every page consistent even if the mutation originated from a
  // non-accounts surface.
  qc.invalidateQueries({ queryKey: saleKeys.all });
  qc.invalidateQueries({ queryKey: customerKeys.all });
  qc.invalidateQueries({ queryKey: supplierKeys.all });
  qc.invalidateQueries({ queryKey: productKeys.all });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof accountsService.create>[0]) =>
      accountsService.create(input),
    onSuccess: () => {
      invalidateAccountAdjacent(qc);
      toast.success("Account added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FinancialAccount> }) =>
      accountsService.update(id, patch),
    onSuccess: () => {
      invalidateAccountAdjacent(qc);
      toast.success("Account updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsService.archive(id),
    onSuccess: () => {
      invalidateAccountAdjacent(qc);
      toast.success("Account archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetDefaultAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsService.setDefault(id),
    onSuccess: () => invalidateAccountAdjacent(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRecordAccountTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromAccountId: string; toAccountId: string; amount: number; note?: string }) => accountsService.transfer(input),
    onSuccess: () => {
      invalidateAccountAdjacent(qc);
      invalidateLedgerSideEffects(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRecordDepositOrWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { accountId: string; direction: "in" | "out"; amount: number; note?: string }) => accountsService.depositOrWithdraw(input),
    onSuccess: () => {
      invalidateAccountAdjacent(qc);
      invalidateLedgerSideEffects(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Backward-compat action bag for legacy callers. Existing pages can
 * keep calling these synchronously — they still drive the Zustand
 * slice and the cache bridge picks the change up immediately. New
 * code should prefer the explicit `useXxx` mutation hooks above so
 * adjacent caches get properly invalidated on driver flip.
 */
export function useAccountActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounts"] });
  return {
    addAccount: (data: Record<string, unknown>) => accountsService.create(data).then(() => invalidate()),
    updateAccount: (id: string, data: Record<string, unknown>) => accountsService.update(id, data as any).then(() => invalidate()),
    archiveAccount: (id: string) => accountsService.archive(id).then(() => invalidate()),
    setDefaultAccount: (id: string) => accountsService.setDefault(id).then(() => invalidate()),
    recordTransfer: (input: { fromAccountId: string; toAccountId: string; amount: number; note?: string }) =>
      accountsService.transfer(input).then(() => invalidate()),
    recordDepositOrWithdraw: (input: { accountId: string; direction: "in" | "out"; amount: number; note?: string }) =>
      accountsService.depositOrWithdraw(input).then(() => invalidate()),
  };
}

// ---------- Shifts ----------

import { shiftsService } from "@/services";
import { useSalesQuery } from "@/features/sales/hooks";

export function useShifts() {
  const { data } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => shiftsService.list(),
    staleTime: 30_000,
  });
  return data ?? [];
}

export function useActiveShift() {
  const { data } = useQuery({
    queryKey: ["shifts", "active"],
    queryFn: () => shiftsService.active(),
    staleTime: 15_000,
  });
  return data ?? null;
}

export function useShiftActions() {
  return {
    open: (openingBalance: number) => shiftsService.open(openingBalance),
    close: (closingCount: number) => shiftsService.close(closingCount),
  };
}

export function useExpectedCash() {
  const active = useActiveShift();
  const { data: salesData } = useSalesQuery();
  const sales = salesData?.items ?? [];
  return useMemo(() => {
    if (!active) return 0;
    const cashSales = sales
      .filter((s) => s.paymentMethod === "Cash" && new Date(s.date) >= new Date(active.openedAt))
      .reduce((sum, s) => sum + s.amountPaid, 0);
    return active.openingBalance + cashSales;
  }, [active, sales]);
}
