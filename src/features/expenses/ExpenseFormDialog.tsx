import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Expense, ExpenseCategory } from "@/shared/lib/types";
import { expenseSchema, ExpenseFormValues } from "./schemas";
import { useCreateExpense, useUpdateExpense } from "./hooks";
import { useActiveAccounts, useAccountBalances } from "@/features/accounts/hooks";
import { ACCOUNT_TYPE_LABEL } from "@/features/accounts/types";
import { formatCurrency } from "@/shared/lib/format";

const CATEGORIES: ExpenseCategory[] = [
  "Rent", "Salary", "Utilities", "Transport", "Marketing", "Maintenance", "Other",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Expense | null;
}

export function ExpenseFormDialog({ open, onOpenChange, editing }: Props) {
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const accounts = useActiveAccounts();
  const balances = useAccountBalances();
  const defaultAccountId =
    accounts.find((a) => a.type === "cash" && a.isDefault)?.id
    ?? accounts.find((a) => a.type === "cash")?.id
    ?? accounts[0]?.id
    ?? "";

  const form = useForm<ExpenseFormValues, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: "Rent",
      amount: 0,
      description: "",
      accountId: defaultAccountId,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        date: editing.date.slice(0, 10),
        category: editing.category,
        amount: editing.amount,
        description: editing.description,
        accountId: editing.accountId ?? defaultAccountId,
      });
    } else {
      form.reset({
        date: new Date().toISOString().slice(0, 10),
        category: "Rent",
        amount: 0,
        description: "",
        accountId: defaultAccountId,
      });
    }
  }, [open, editing, form, defaultAccountId]);

  const onSubmit = async (values: ExpenseFormValues) => {
    const payload = {
      date: new Date(values.date).toISOString(),
      category: values.category,
      amount: values.amount,
      description: values.description,
      accountId: values.accountId,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (৳)</FormLabel>
                <FormControl>
                  <Input type="number" autoFocus {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="accountId" render={({ field }) => (
              <FormItem>
                <FormLabel>Paid From Account</FormLabel>
                {accounts.length === 0 ? (
                  <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-2">
                    No active account. Add one on the Accounts page first.
                  </p>
                ) : (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} · {ACCOUNT_TYPE_LABEL[a.type]} · {formatCurrency(balances[a.id] ?? 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <LoadingButton type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" loading={submitting} disabled={accounts.length === 0}>
                {editing ? "Save Changes" : "Add Expense"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
