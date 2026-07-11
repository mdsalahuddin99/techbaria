import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesService } from "@/services";
import { expenseKeys } from "./queryKeys";
import { accountKeys, ledgerKeys } from "@/features/accounts/queryKeys";
import { Expense } from "@/shared/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

/** Primary expenses-list query — fed by `useExpensesCacheBridge`. */
export function useExpensesQuery(initialData?: any) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: expenseKeys.list(),
    queryFn: () => expensesService.list(),
    enabled: status !== "loading" && !!session,
    initialData,
    ...QueryTier.MASTER_DATA,
  });
}

/** Backward-compat hook returning the same shape as before. */
export function useExpenses(initialData?: Expense[]) {
  const q = useExpensesQuery(
    initialData ? { items: initialData, total: initialData.length } : undefined
  );
  return { data: ((q.data as any)?.items ?? []) as Expense[], isLoading: q.isLoading, error: q.error };
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: expenseKeys.all });
  // A new/edited/deleted expense appends/removes a ledger entry on the
  // cash (or chosen) account → refresh balances + ledger consumers.
  qc.invalidateQueries({ queryKey: accountKeys.all });
  qc.invalidateQueries({ queryKey: ledgerKeys.all });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Expense, "id" | "recordedBy">) => expensesService.create(data),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Expense recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Expense> }) =>
      expensesService.update(id, patch),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Expense updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesService.remove(id),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Expense deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
