/**
 * CustomerWalletDialog — unified Deposit / Withdraw for customer wallet.
 *
 * ── Deposit (Receive Payment)  → calls ledgerService.collectDue  (PAYMENT)
 * ── Withdraw (Pay Out/Refund)  → calls ledgerService.withdrawCustomerWallet (REFUND)
 */
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
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
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
import { useCollectPayment, useWithdrawPayment, useDepositAdvance } from "./ledgerHooks";
import { useAccountBalances } from "@/features/accounts/hooks";
import { formatCurrency } from "@/shared/lib/format";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

type WalletAction = "deposit" | "withdraw";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  currentBalance: number;
  accounts: FinancialAccount[];
}

export function CustomerWalletDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentBalance,
  accounts,
}: Props) {
  const [action, setAction] = useState<WalletAction>("deposit");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<AccountType | "">("");
  const [accountId, setAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const filteredAccounts = method ? accounts.filter((a) => a.type === method) : [];
  const balances = useAccountBalances(accounts);

  const deposit = useDepositAdvance();
  const withdraw = useWithdrawPayment();
  const isPending = deposit.isPending || withdraw.isPending;

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount > 0 && accountId;

  const handleSubmit = async () => {
    if (!isValid) return;

    const payload = {
      customerId,
      amount: numAmount,
      accountId,
      reference: reference || undefined,
      notes: notes || undefined,
    };

    if (action === "deposit") {
      await deposit.mutateAsync(payload);
    } else {
      await withdraw.mutateAsync(payload);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount("");
    setMethod("");
    setAccountId("");
    setReference("");
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Balance summary ── */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Balance</span>
              <span className={`font-semibold ${
                currentBalance > 0 ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
            {currentBalance === 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                No advance balance. Deposit to add funds to wallet.
              </p>
            )}
            {currentBalance > 0 && (
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                ✓ Customer has {formatCurrency(currentBalance)} advance credit available
              </p>
            )}
          </div>

          {/* ── Action tabs ── */}
          <Tabs
            value={action}
            onValueChange={(v) => setAction(v as WalletAction)}
          >
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger
                value="deposit"
                className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                Deposit
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="text-xs data-[state=active]:bg-orange-600 data-[state=active]:text-white"
              >
                <ArrowUpFromLine className="h-4 w-4 mr-1.5" />
                Withdraw
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ── Amount ── */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* ── Method (Account) ── */}
          <div className="space-y-2">
            <Label htmlFor="method">Account *</Label>
            <Select
              value={method}
              onValueChange={(v) => {
                setMethod(v as AccountType);
                setAccountId(""); // reset account when method changes
              }}
            >
              <SelectTrigger id="method">
                <SelectValue placeholder="Select Account (e.g. Bank)" />
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

          {/* ── Ledger (Account specific) ── */}
          {method && (
            <div className="space-y-2">
              <Label htmlFor="account">
                {action === "deposit" ? "Deposit to Ledger *" : "Withdraw from Ledger *"}
              </Label>
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
              {accountId && balances[accountId] !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ledger Balance: <span className="font-medium text-foreground">{formatCurrency(balances[accountId])}</span>
                </p>
              )}
            </div>
          )}

          {/* ── Reference ── */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input
              id="reference"
              placeholder="Receipt no, invoice no…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* ── Notes ── */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Any notes…"
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
            className={
              action === "deposit"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }
          >
            {action === "deposit" ? "Deposit" : "Withdraw"}{" "}
            {numAmount > 0 ? formatCurrency(numAmount) : ""}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
