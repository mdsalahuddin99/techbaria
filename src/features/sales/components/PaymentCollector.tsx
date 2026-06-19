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
import { Plus, X, ChevronDown, Zap, CheckCircle2 } from "lucide-react";
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
  discount: number;
  onDiscountChange: (v: number) => void;

  payments: SalePayment[];
  onAddPayment: (p: SalePayment) => void;
  onRemovePayment: (idx: number) => void;

  /** Customer (for wallet balance) */
  customerId: string | null;
  customers: Customer[];

  vat: number;
  extraCharges: number;

  /** Quick customer inline form shown when there's credit with no customer */
  quickName: string;
  quickPhone: string;
  onQuickNameChange: (v: string) => void;
  onQuickPhoneChange: (v: string) => void;
}

export function PaymentCollector({
  subtotal,
  discount,
  onDiscountChange,
  vat,
  extraCharges,
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
  const afterDiscount = round2(Math.max(0, subtotal - discount + vat + extraCharges));
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

  // Auto-fill pendingAmount with remaining due amount on mount, method change, or due change
  useEffect(() => {
    if (dueNum > 0) {
      setPendingAmount(dueNum.toString());
    } else {
      setPendingAmount("");
    }
  }, [dueNum, pendingMethod]);

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

  const fullyPaid = dueNum <= 0;
  const needsQuickCust = dueNum > 0 && (!customerId || customerId === "c1");

  return (
    <Collapsible defaultOpen className="rounded-xl border border-slate-200 bg-card overflow-hidden">
      {/* Header */}
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Payment
          </span>
          <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(afterDiscount)}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 text-xs">
            Paid: <span className="font-semibold text-slate-700">{formatCurrency(paidNum)}</span>
          </span>
          {dueNum > 0 ? (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-orange-500">
                Due: {formatCurrency(dueNum)}
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Full Paid
              </span>
            </>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform ui-open:rotate-180 shrink-0" />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-slate-100">
        <div className="px-4 py-4 space-y-4">

          {/* Discount field */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Flat Discount
              </label>
              <Input
                type="number"
                min={0}
                max={subtotal}
                value={discount === 0 ? "" : discount}
                onChange={(e) => {
                  const v = round2(Math.max(0, Number(e.target.value) || 0));
                  if (v > subtotal) {
                    toast.error("Discount cannot exceed subtotal");
                    return;
                  }
                  onDiscountChange(v);
                }}
                placeholder="0.00"
                className="h-9 text-right text-sm border-slate-200"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Subtotal
              </label>
              <div className="h-9 flex items-center px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 tabular-nums">
                {formatCurrency(subtotal)}
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Invoice Total
              </label>
              <div className="h-9 flex items-center px-3 rounded-lg bg-teal-50 border border-teal-100 text-sm font-bold text-teal-700 tabular-nums">
                {formatCurrency(afterDiscount)}
              </div>
            </div>
          </div>

          {/* Applied tenders */}
          {payments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {payments.map((p, i) => (
                <Badge
                  key={`${p.method}-${i}`}
                  variant="secondary"
                  className="text-xs gap-1.5 pr-1 pl-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {METHOD_ICONS[p.method] ?? "💳"} {p.method === "Card" ? "Bank" : p.method}:{" "}
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onRemovePayment(i)}
                    className="ml-0.5 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <span className="text-xs text-slate-400 self-center ml-1">
                = {formatCurrency(paidNum)}
              </span>
            </div>
          )}

          {/* Add tender form */}
          {!fullyPaid && (
            <div className="space-y-2">
              <div className="flex items-end gap-2 flex-wrap">
                {/* Method */}
                <div className="flex-1 min-w-36 space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Method</label>
                  <Select
                    value={pendingMethod}
                    onValueChange={(v) => {
                      setPendingMethod(v as PaymentMethod);
                      setPendingAmount("");
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">💵 Cash</SelectItem>
                      <SelectItem value="Card">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="Mobile Banking">📱 Mobile Banking</SelectItem>
                      <SelectItem value="Wallet">
                        💳 Wallet{walletBalance > 0 ? ` (${formatCurrency(walletBalance)})` : ""}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="flex-1 min-w-28 space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Amount</label>
                  <Input
                    type="number"
                    min={0}
                    max={dueNum}
                    value={pendingAmount}
                    onChange={(e) => setPendingAmount(e.target.value)}
                    placeholder={formatCurrency(dueNum)}
                    className="h-9 text-right border-slate-200 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") commitTender(); }}
                  />
                </div>

                {/* Account (for bank / mobile) */}
                {["Card", "Mobile Banking"].includes(pendingMethod) &&
                  accountsForMethod(pendingMethod).length > 0 && (
                    <div className="w-32 space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">Account</label>
                      <Select
                        value={pendingAccountId ?? ""}
                        onValueChange={setPendingAccountId}
                      >
                        <SelectTrigger className="h-9 border-slate-200 text-xs">
                          <SelectValue placeholder="Acct" />
                        </SelectTrigger>
                        <SelectContent>
                          {flattenAccountTree(accountsForMethod(pendingMethod)).map((n) => (
                            <SelectItem key={n.account.id} value={n.account.id} className="text-xs">
                              {n.account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                <Button
                  type="button"
                  size="sm"
                  className="h-9 bg-teal-700 hover:bg-teal-800 text-white self-end"
                  onClick={commitTender}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {/* Fast-fill shortcut */}
              {payments.length === 0 && (
                <button
                  type="button"
                  onClick={fastFillCash}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 transition-colors"
                >
                  <Zap className="h-3 w-3" /> Full Cash ({formatCurrency(dueNum)})
                </button>
              )}
            </div>
          )}

          {/* Quick customer form for credit sales */}
          {needsQuickCust && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-orange-600">
                ⚠ Credit sale — provide customer details to record the due
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Customer name"
                  value={quickName}
                  onChange={(e) => onQuickNameChange(e.target.value)}
                  className="h-8 text-xs border-orange-200 bg-card"
                />
                <Input
                  placeholder="Phone number"
                  value={quickPhone}
                  onChange={(e) => onQuickPhoneChange(e.target.value)}
                  className="h-8 text-xs border-orange-200 bg-card"
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
