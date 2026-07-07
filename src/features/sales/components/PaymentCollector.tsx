"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/shared/ui/collapsible";
import { Plus, X, ChevronDown, Zap, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, round2 } from "@/shared/lib/format";
import { flattenAccountTree } from "@/features/accounts/tree";
import { useAccountsByType } from "@/features/accounts/hooks";
import { toast } from "sonner";
import type { PaymentMethod, SalePayment } from "@/shared/lib/types";

const METHOD_ICONS: Record<string, string> = {
  Cash: "💵",
  Card: "🏦",
  "Mobile Banking": "📱",
  Wallet: "💳",
  Due: "📋",
};

interface Customer {
  id: string;
  name: string;
  balance?: number;
}

interface PaymentCollectorProps {
  subtotal: number;

  payments: SalePayment[];
  onAddPayment: (p: SalePayment) => void;
  onRemovePayment: (idx: number) => void;

  /** Customer (for wallet balance) */
  customerId: string | null;
  customers: Customer[];



  /** Quick customer inline form shown when there's credit with no customer */
  quickName: string;
  quickPhone: string;
  onQuickNameChange: (v: string) => void;
  onQuickPhoneChange: (v: string) => void;
}

export function PaymentCollector({
  subtotal,
  payments,
  onAddPayment,
  onRemovePayment,
  customerId,
  customers,
  quickName,
  quickPhone,
  onQuickNameChange,
  onQuickPhoneChange,
}: PaymentCollectorProps) {
  const afterDiscount = round2(Math.max(0, subtotal));
  const paidNum = round2(payments.reduce((s, p) => s + p.amount, 0));
  const dueNum = round2(Math.max(0, afterDiscount - paidNum));

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const walletBalance = Math.max(0, Number(customer?.balance ?? 0));

  // Pending tender state
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod>("Cash");
  const [pendingAmount, setPendingAmount] = useState("");
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);

  const cashAccounts = useAccountsByType("cash");
  const bankAccounts = useAccountsByType("bank");
  const mobileAccounts = useAccountsByType("mobile_banking");

  const accountsForMethod = (m: PaymentMethod) =>
    m === "Cash" ? cashAccounts : m === "Card" ? bankAccounts : m === "Mobile Banking" ? mobileAccounts : [];

  // Auto-pick default account when method changes
  useEffect(() => {
    const pool = accountsForMethod(pendingMethod);
    if (pool.length > 0) {
      const def = pool.find((a) => a.isDefault) ?? pool[0];
      setPendingAccountId(def?.id ?? null);
    } else {
      setPendingAccountId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMethod, cashAccounts.length, bankAccounts.length, mobileAccounts.length]);

  // Auto-fill pendingAmount with remaining due amount on mount or due change
  useEffect(() => {
    if (dueNum > 0) {
      setPendingAmount((prev) => (prev === "" || prev === "0" ? dueNum.toString() : prev));
    } else {
      setPendingAmount("");
    }
  }, [dueNum]);

  // Auto-fix account IDs when accounts load
  useEffect(() => {
    // nothing to mutate here — parent owns payments array
  }, [cashAccounts, bankAccounts, mobileAccounts]);

  const commitTender = () => {
    const amt = round2(Number(pendingAmount) || 0);
    if (amt <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (amt > dueNum) { toast.error(`Amount cannot exceed due ${formatCurrency(dueNum)}`); return; }
    if (pendingMethod === "Wallet" && amt > walletBalance) {
      toast.error(`Wallet balance is only ${formatCurrency(walletBalance)}`);
      return;
    }
    const pool = accountsForMethod(pendingMethod);
    const acctId = pendingAccountId ?? (pool.find((a) => a.isDefault) ?? pool[0] ?? null)?.id ?? null;
    if (pool.length > 0 && !acctId) { toast.error(`Select an account for ${pendingMethod}`); return; }
    onAddPayment({ method: pendingMethod, amount: amt, accountId: acctId });
    setPendingAmount("");
  };

  const fastFillCash = () => {
    if (dueNum <= 0) return;
    const def = cashAccounts.find((a) => a.isDefault) ?? cashAccounts[0] ?? null;
    onAddPayment({ method: "Cash", amount: dueNum, accountId: def?.id ?? null });
  };

  const handleEditPayment = (idx: number) => {
    const p = payments[idx];
    setPendingMethod(p.method);
    setPendingAmount(p.amount.toString());
    setPendingAccountId(p.accountId);
    onRemovePayment(idx);
  };

  const fullyPaid = dueNum <= 0;
  const needsQuickCust = dueNum > 0 && (!customerId || customerId === "c1");

  return (
    <Collapsible defaultOpen className="rounded-[4px] border border-border bg-card overflow-hidden">
      {/* Header */}
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-secondary/40 transition-colors">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Payment
          </span>
          <span className="font-extrabold text-slate-800 tabular-nums text-xs">{formatCurrency(afterDiscount)}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600 text-[11px]">
            Paid: <span className="font-semibold text-slate-800">{formatCurrency(paidNum)}</span>
          </span>
          {dueNum > 0 ? (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-bold text-orange-600">
                Due: {formatCurrency(dueNum)}
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Paid
              </span>
            </>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform ui-open:rotate-180 shrink-0" />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border">
        <div className="px-3 py-3 space-y-3">

          {/* Subtotal + Total */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Subtotal
              </label>
              <div className="h-7 flex items-center px-2 rounded-[4px] bg-secondary/40 border border-border text-xs font-semibold text-slate-700 tabular-nums">
                {formatCurrency(subtotal)}
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total
              </label>
              <div className="h-7 flex items-center justify-end px-2 rounded-[4px] bg-primary/10 border border-primary/20 text-xs font-extrabold text-primary tabular-nums">
                {formatCurrency(afterDiscount)}
              </div>
            </div>
          </div>

          {/* Processed Payments list */}
          {payments.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Payments
              </label>
              <div className="space-y-1">
                {payments.map((p, i) => {
                  const pool = accountsForMethod(p.method);
                  const account = pool.find((a) => a.id === p.accountId);
                  return (
                    <div
                      key={`${p.method}-${i}`}
                      className="flex items-center justify-between p-2 bg-secondary/35 border border-border rounded-[4px]"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[11px]">
                        <span className="text-xs shrink-0">{METHOD_ICONS[p.method] ?? "💳"}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 text-[11px]">
                            {p.method === "Card" ? "Bank" : p.method}
                          </p>
                          {account && (
                            <p className="text-[9px] text-slate-400 truncate">
                              {account.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-slate-800 tabular-nums">
                          {formatCurrency(p.amount)}
                        </span>
                        <div className="flex items-center gap-0.5 border-l border-border pl-1 ml-0.5">
                          <button
                            type="button"
                            onClick={() => handleEditPayment(i)}
                            className="h-5 w-5 rounded-[4px] grid place-items-center text-slate-400 hover:text-primary hover:bg-secondary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onRemovePayment(i);
                              setPendingAmount("");
                            }}
                            className="h-5 w-5 rounded-[4px] grid place-items-center text-slate-400 hover:text-destructive hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add tender form — 2-column layout */}
          {!fullyPaid && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Add Payment</label>
              <div className="grid grid-cols-2 gap-2">
                {/* Mode */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mode</label>
                  <Select
                    value={pendingMethod}
                    onValueChange={(v) => {
                      const nextMethod = v as PaymentMethod;
                      setPendingMethod(nextMethod);
                      const defaultAmt = nextMethod === "Wallet" ? Math.min(walletBalance, dueNum) : dueNum;
                      setPendingAmount(defaultAmt > 0 ? defaultAmt.toString() : "");
                    }}
                  >
                    <SelectTrigger className="h-8 border-border bg-card text-[11px] rounded-[4px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">💵 Cash</SelectItem>
                      <SelectItem value="Card">🏦 Bank</SelectItem>
                      <SelectItem value="Mobile Banking">📱 Mobile</SelectItem>
                      <SelectItem value="Wallet">
                        💳 Wallet{walletBalance > 0 ? ` (${formatCurrency(walletBalance)})` : ""}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Account */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Account</label>
                  {pendingMethod === "Wallet" ? (
                    <Select disabled value="wallet-na">
                      <SelectTrigger className="h-8 border-border bg-secondary/35 text-slate-400 text-[11px] rounded-[4px]">
                        <SelectValue placeholder="N/A" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wallet-na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={pendingAccountId ?? ""}
                      onValueChange={setPendingAccountId}
                    >
                      <SelectTrigger className="h-8 border-border bg-card text-[11px] rounded-[4px]">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {flattenAccountTree(accountsForMethod(pendingMethod)).map((n) => (
                          <SelectItem key={n.account.id} value={n.account.id} className="text-xs">
                            {n.account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Amount + Add button in one row */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Amount</label>
                  <Input
                    type="number"
                    min={0}
                    max={dueNum}
                    value={pendingAmount}
                    onChange={(e) => setPendingAmount(e.target.value)}
                    placeholder={formatCurrency(dueNum)}
                    className="h-8 text-right border-border bg-card text-[11px] rounded-[4px]"
                    onKeyDown={(e) => { if (e.key === "Enter") commitTender(); }}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-transparent uppercase tracking-wider block select-none">.</label>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/95 text-white px-3 rounded-[4px] font-bold text-[11px]"
                    onClick={commitTender}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Fast-fill shortcut */}
              {payments.length === 0 && (
                <button
                  type="button"
                  onClick={fastFillCash}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary transition-colors font-semibold"
                >
                  <Zap className="h-3 w-3" /> Full Cash ({formatCurrency(dueNum)})
                </button>
              )}
            </div>
          )}

          {/* Quick customer form for credit sales */}
          {needsQuickCust && (
            <div className="rounded-[4px] border border-orange-300/60 bg-orange-500/5 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold text-orange-600">
                ⚠ Credit — add customer details
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  placeholder="Name"
                  value={quickName}
                  onChange={(e) => onQuickNameChange(e.target.value)}
                  className="h-7 text-[11px] border-orange-300/60 bg-card rounded-[4px]"
                />
                <Input
                  placeholder="Phone"
                  value={quickPhone}
                  onChange={(e) => onQuickPhoneChange(e.target.value)}
                  className="h-7 text-[11px] border-orange-300/60 bg-card rounded-[4px]"
                  inputMode="tel"
                />
              </div>
            </div>
          )}

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
