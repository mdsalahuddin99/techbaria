"use client";

import { useState } from "react";
import type { AccountType, FinancialAccount } from "@/features/accounts/types";
import { ACCOUNT_TYPE_LABEL } from "@/features/accounts/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { LoadingButton } from "@/shared/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useAccountBalances } from "@/features/accounts/hooks";
import { formatCurrency } from "@/shared/lib/format";
import { useSaleMutations } from "@/features/sales/hooks";
import { Sale } from "@/shared/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  accounts: FinancialAccount[];
}

export function InvoiceDueCollectDialog({
  open,
  onOpenChange,
  sale,
  accounts,
}: Props) {
  const due = sale ? Math.max(0, sale.total - sale.amountPaid) : 0;
  
  const [amount, setAmount] = useState(due.toString());
  const [method, setMethod] = useState<AccountType | "">("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");

  const filteredAccounts = method ? accounts.filter((a) => a.type === method) : [];
  const balances = useAccountBalances(accounts);

  const { collectDue } = useSaleMutations();
  const [isPending, setIsPending] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount > 0 && numAmount <= due && accountId;

  // Sync amount with due when modal opens
  if (sale && open && amount === "" && numAmount !== due) {
      setAmount(due.toString());
  }

  const handleSubmit = async () => {
    if (!isValid || !sale) return;
    setIsPending(true);
    try {
      await collectDue(sale.id, {
        amount: numAmount,
        accountId,
        type: method,
        notes: notes || undefined,
      });
      onOpenChange(false);
      resetForm();
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setAmount(due.toString());
    setMethod("");
    setAccountId("");
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Invoice Due</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice No</span>
              <span className="font-semibold">{sale.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{sale.customerName}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-border">
              <span className="text-muted-foreground">Total Due</span>
              <span className="font-bold text-warning">
                {formatCurrency(due)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Collection Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={due}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {numAmount > due && (
              <p className="text-xs text-destructive">Amount cannot exceed total due ({formatCurrency(due)})</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Account Type *</Label>
            <Select
              value={method}
              onValueChange={(v) => {
                setMethod(v as AccountType);
                setAccountId("");
              }}
            >
              <SelectTrigger id="method">
                <SelectValue placeholder="Select Account Type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABEL).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method && (
            <div className="space-y-2">
              <Label htmlFor="account">Deposit Ledger *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select Ledger" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {balances[a.id] !== undefined ? `(${formatCurrency(balances[a.id])})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            disabled={!isValid}
            loading={isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Collect {numAmount > 0 ? formatCurrency(numAmount) : ""}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
