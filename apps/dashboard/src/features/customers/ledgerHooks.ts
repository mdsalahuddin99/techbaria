/**
 * Customer Ledger hooks — React Query wrappers for the ledger API.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/shared/api-client/customers";
import { customerKeys } from "./queryKeys";
import { accountKeys, ledgerKeys as acctLedgerKeys } from "@/features/accounts/queryKeys";
import { posInitKeys } from "@/features/pos/hooks";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  type: "SALE" | "PAYMENT" | "REFUND" | "ADJUSTMENT" | "WRITE_OFF";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  saleId: string | null;
  accountId: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface CustomerBalanceInfo {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  due: number;
  creditLimit: number;
  notes: string | null;
  availableCredit: number;
  isOverLimit: boolean;
}

// ─── Query keys ─────────────────────────────────────────────────────────────

const ledgerKeys = {
  all: ["customer-ledger"] as const,
  ledger: (customerId: string) => [...ledgerKeys.all, "ledger", customerId] as const,
  balance: (customerId: string) => [...ledgerKeys.all, "balance", customerId] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────

export function useCustomerLedger(customerId: string | null, page = 1) {
  return useQuery({
    queryKey: [...ledgerKeys.ledger(customerId ?? ""), page],
    queryFn: () => customersApi.getLedger(customerId!, page, 20),
    enabled: !!customerId,
  });
}

export function useCustomerBalance(customerId: string | null) {
  return useQuery({
    queryKey: ledgerKeys.balance(customerId ?? ""),
    queryFn: () => customersApi.getBalance(customerId!),
    enabled: !!customerId,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCollectPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      amount,
      accountId,
      reference,
      notes,
    }: {
      customerId: string;
      amount: number;
      accountId: string;
      reference?: string;
      notes?: string;
    }) => customersApi.collectPayment(customerId, { amount, accountId, reference, notes }),

    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...ledgerKeys.ledger(variables.customerId)] });
      qc.invalidateQueries({ queryKey: [...ledgerKeys.balance(variables.customerId)] });
      qc.invalidateQueries({ queryKey: customerKeys.all });
      qc.invalidateQueries({ queryKey: acctLedgerKeys.all });
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: posInitKeys.all });
      qc.refetchQueries({ queryKey: customerKeys.list() });
      toast.success("Payment recorded successfully");
    },

    onError: (e: Error) => {
      toast.error(e.message ?? "Payment failed");
    },
  });
}

export function useDepositAdvance() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      amount,
      accountId,
      reference,
      notes,
    }: {
      customerId: string;
      amount: number;
      accountId: string;
      reference?: string;
      notes?: string;
    }) => customersApi.depositAdvance(customerId, { amount, accountId, reference, notes }),

    onSuccess: (_data: any, variables) => {
      qc.invalidateQueries({ queryKey: [...ledgerKeys.ledger(variables.customerId)] });
      qc.invalidateQueries({ queryKey: [...ledgerKeys.balance(variables.customerId)] });
      qc.invalidateQueries({ queryKey: acctLedgerKeys.all });
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: posInitKeys.all });

      // Force fresh fetch of customers list from server
      qc.invalidateQueries({ queryKey: customerKeys.all });
      qc.refetchQueries({ queryKey: customerKeys.list() });

      toast.success("Advance deposited successfully");
    },

    onError: (e: Error) => {
      toast.error(e.message ?? "Deposit failed");
    },
  });
}

export function useWithdrawPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      amount,
      accountId,
      reference,
      notes,
    }: {
      customerId: string;
      amount: number;
      accountId: string;
      reference?: string;
      notes?: string;
    }) => customersApi.withdrawPayment(customerId, { amount, accountId, reference, notes }),

    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...ledgerKeys.ledger(variables.customerId)] });
      qc.invalidateQueries({ queryKey: [...ledgerKeys.balance(variables.customerId)] });
      qc.invalidateQueries({ queryKey: customerKeys.all });
      qc.invalidateQueries({ queryKey: acctLedgerKeys.all });
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: posInitKeys.all });
      qc.refetchQueries({ queryKey: customerKeys.list() });
      toast.success("Withdrawal recorded successfully");
    },

    onError: (e: Error) => {
      toast.error(e.message ?? "Withdrawal failed");
    },
  });
}
