"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/shared/ui/sheet";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Input } from "@/shared/ui/input";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { Package, Printer, Plus, Trash2 } from "lucide-react";
import { usePurchaseActions } from "@/features/purchases/hooks";
import { statusBadge } from "./PurchaseList";
import { methodFromAccountType } from "../hooks/usePurchaseForm";
import { ACCOUNT_TYPE_LABEL } from "@/features/accounts/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface PurchaseDetailSheetProps {
  detail: any | null;
  onClose: () => void;
  accounts: any[];
  accountsTree: any[];
  balances: Record<string, number>;
  defaultAccountId: string;
  onPrint: (id: string) => void;
}

export function PurchaseDetailSheet({
  detail, onClose, accounts, accountsTree, balances, defaultAccountId, onPrint
}: PurchaseDetailSheetProps) {
  const { addPayment, receive: receivePurchase, deletePayment } = usePurchaseActions();

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payAccountId, setPayAccountId] = useState<string>("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [recvQty, setRecvQty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (detail) {
      const init: Record<string, number> = {};
      detail.items.forEach((i: any) => { init[i.productId] = i.receivedQty; });
      setRecvQty(init);
    } else {
      setRecvQty({});
      setPayAmount("");
      setPayNote("");
    }
  }, [detail]);

  useEffect(() => {
    if (!payAccountId && defaultAccountId) setPayAccountId(defaultAccountId);
  }, [defaultAccountId, payAccountId]);

  if (!detail) return null;

  const due = Math.max(0, detail.subtotal - detail.amountPaid);
  const payAccount = payAccountId === "WALLET" ? { type: "WALLET", name: "Supplier Wallet Advance" } : accounts.find((a) => a.id === payAccountId);

  const handleAddPayment = async () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("Amount দিন");
    if (amt > due) return toast.error(`বাকি মাত্র ${formatCurrency(due)}`);
    if (!payAccountId) return toast.error("কোন account থেকে দিচ্ছেন select করুন");
    
    const method = payAccountId === "WALLET" ? "Wallet" : methodFromAccountType(payAccount?.type);
    setPaying(true);
    try {
      await addPayment(detail.id, { amount: amt, method, accountId: payAccountId, note: payNote || undefined });
      toast.success(`${formatCurrency(amt)} payment recorded`);
      setPayAmount("");
      setPayNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Sheet open={!!detail} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{detail.poNumber}</SheetTitle>
          <SheetDescription>
            {detail.supplierName} · {formatDateTime(detail.createdAt)}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <div>Status: {statusBadge(detail.status)}</div>
            {detail.expectedDate && <div>Expected: {formatDate(detail.expectedDate)}</div>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border p-2.5">
              <div className="text-[11px] uppercase text-muted-foreground">Total</div>
              <div className="font-bold text-primary">{formatCurrency(detail.subtotal)}</div>
            </div>
            <div className="rounded-md border p-2.5">
              <div className="text-[11px] uppercase text-muted-foreground">Paid</div>
              <div className="font-bold text-accent">{formatCurrency(detail.amountPaid)}</div>
            </div>
            <div className="rounded-md border p-2.5">
              <div className="text-[11px] uppercase text-muted-foreground">Due</div>
              <div className={`font-bold ${due > 0 ? "text-warning" : ""}`}>{formatCurrency(due)}</div>
            </div>
          </div>

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
              <TabsTrigger value="items">Items ({detail.items?.length || 0})</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-3 m-0">
            {detail.items.map((i: any) => {
              const tracked = (i.serials?.length ?? 0) > 0;
              return (
                <Card key={i.productId} className="p-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{i.name}</span>
                    <span className="text-sm">
                      {i.qty} × {formatCurrency(i.costPrice)} = <strong>{formatCurrency(i.qty * i.costPrice)}</strong>
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      Received: <strong className={i.receivedQty >= i.qty ? "text-accent" : "text-warning"}>{i.receivedQty}</strong> / {i.qty}
                    </div>
                    {i.warrantyStartDate && (
                      <div>Warranty Start: <strong>{formatDate(i.warrantyStartDate)}</strong></div>
                    )}
                  </div>
                  {!tracked && detail.status !== "Received" && i.receivedQty < i.qty && (
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-muted-foreground">Receive now</label>
                      <Input
                        type="number" min={0} max={i.qty} className="w-24 h-8"
                        value={recvQty[i.productId] ?? i.receivedQty}
                        onChange={(e) => setRecvQty((prev) => ({
                          ...prev,
                          [i.productId]: Math.max(0, Math.min(i.qty, Number(e.target.value) || 0)),
                        }))}
                      />
                      <span className="text-[11px] text-muted-foreground">unit (max {i.qty})</span>
                    </div>
                  )}
                  {i.serials && i.serials.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {i.serials.map((s: string) => (
                        <Badge key={s} variant="outline" className="font-mono text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

          {/* Partial receive action */}
          {detail.status !== "Received" && detail.items.some((i: any) => (i.serials?.length ?? 0) === 0 && i.receivedQty < i.qty) && (
            <Button
              variant="outline" className="w-full"
              onClick={() => {
                receivePurchase(detail.id, recvQty);
                toast.success("Received quantities updated");
              }}
            >
              <Package className="h-4 w-4 mr-1" />Update Received Quantities
            </Button>
          )}

            </TabsContent>

            <TabsContent value="payments" className="space-y-4 m-0">
              {/* Payment history */}
              <Card className="p-3 space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Payment History ({detail.payments?.length ?? 0})
            </div>
            {(detail.payments?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">এখনো কোনো payment record নেই।</p>
            ) : (
              <div className="divide-y">
                {detail.payments!.map((pay: any) => {
                  const acc = pay.accountId ? accounts.find((a) => a.id === pay.accountId) : undefined;
                  return (
                    <div key={pay.id} className="flex justify-between items-start py-2 text-sm">
                      <div>
                        <div className="font-medium">{formatCurrency(pay.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(pay.date)} · {acc ? acc.name : pay.method}
                        </div>
                        {pay.note && <div className="text-xs text-muted-foreground mt-0.5">{pay.note}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pay.method}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this payment?")) {
                              try {
                                await deletePayment(detail.id, pay.id);
                                toast.success("Payment deleted");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to delete payment");
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Add new payment */}
          {due > 0 && (
            <Card className="p-3 bg-secondary/40 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Add Payment · বাকি {formatCurrency(due)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1.4fr] gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Amount ৳</label>
                  <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(due)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Method</label>
                  <Select
                    value={payMethod}
                    onValueChange={(v) => {
                      setPayMethod(v);
                      const matchingAccounts = accountsTree.filter((n: any) => methodFromAccountType(n.account.type) === v);
                      setPayAccountId(v === "WALLET" ? "WALLET" : (matchingAccounts[0]?.account?.id || ""));
                    }}
                  >
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Bank</SelectItem>
                      <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                      {(detail.supplierAdvance ?? 0) > 0 && <SelectItem value="WALLET">Wallet</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Paid From</label>
                  {payMethod === "WALLET" ? (
                    <div className="flex items-center px-3 h-10 border rounded-md bg-green-50/50 dark:bg-green-900/20 text-[11px] font-semibold text-green-700 dark:text-green-400">
                      Supplier Wallet Advance · {formatCurrency(detail.supplierAdvance)}
                    </div>
                  ) : accountsTree.filter((n) => methodFromAccountType(n.account.type) === payMethod).length === 0 ? (
                    <div className="text-xs text-muted-foreground border rounded-md h-10 flex items-center px-3">
                      Account নেই
                    </div>
                  ) : (
                    <Select value={payAccountId} onValueChange={setPayAccountId}>
                      <SelectTrigger><SelectValue placeholder="Account select করুন" /></SelectTrigger>
                      <SelectContent>
                        {accountsTree
                          .filter((n) => methodFromAccountType(n.account.type) === payMethod)
                          .map((n) => (
                            <SelectItem key={n.account.id} value={n.account.id}>
                              {n.depth > 0 ? "\u00A0\u00A0↳ " : ""}{n.account.name} · {formatCurrency(balances[n.account.id] ?? 0)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              {payAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Method: <strong>{payAccountId === "WALLET" ? "Wallet" : methodFromAccountType(payAccount.type)}</strong> 
                  {payAccountId !== "WALLET" && ` · বর্তমান balance ${formatCurrency(balances[payAccount.id] ?? 0)}`}
                </p>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Note (optional)</label>
                <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </div>
              <LoadingButton onClick={handleAddPayment} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" loading={paying}>
                <Plus className="h-4 w-4 mr-1" />Record Payment
              </LoadingButton>
            </Card>
          )}
          </TabsContent>
        </Tabs>

          {detail.note && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs mb-1">Note</p>
              <p>{detail.note}</p>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => onPrint(detail.id)}>
            <Printer className="h-4 w-4 mr-1" />Print Invoice
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
