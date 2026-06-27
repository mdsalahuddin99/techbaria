"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { useSales } from "@/features/sales/hooks";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Search, Undo2, Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { RefundMethod, Sale } from "@/shared/lib/types";
import { toast } from "sonner";
import { PageHeader, EmptyState, ConfirmDialog } from "@/shared/components";
import { useReturns, useReturnActions } from "@/features/sales/hooks";
import { useActiveAccounts, useAccountBalances } from "@/features/accounts/hooks";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/features/accounts/types";

export function ReturnsClient({
  initialSales,
  initialReturns,
  initialAccounts,
  initialLedger,
}: {
  initialSales: any[];
  initialReturns: any[];
  initialAccounts: any[];
  initialLedger: any[];
}) {
  usePageTitle("Returns");
  const { data: sales } = useSales(initialSales as any);
  const { data: returns } = useReturns(initialReturns as any);
  const { createReturn, deleteReturn } = useReturnActions();
  const [search, setSearch] = useState("");
  const [openSale, setOpenSale] = useState<Sale | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredReturns = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return returns;
    return returns.filter(
      (r) =>
        r.returnNo.toLowerCase().includes(q) ||
        r.invoiceNo.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q)
    );
  }, [returns, search]);

  const totals = useMemo(() => {
    const refund = returns.reduce((s, r) => s + r.refundAmount, 0);
    return { count: returns.length, refund };
  }, [returns]);

  const returnedQtyMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    returns.forEach((r) => {
      const sub = map.get(r.saleId) ?? new Map<string, number>();
      r.items.forEach((i) => sub.set(i.productId, (sub.get(i.productId) ?? 0) + i.qty));
      map.set(r.saleId, sub);
    });
    return map;
  }, [returns]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Returns & Refunds"
        description="Process refunds against past invoices and track restocking."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Returns</p>
          <p className="text-2xl font-bold mt-1">{totals.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Refunded Amount</p>
          <p className="text-2xl font-bold mt-1 text-destructive">
            {formatCurrency(totals.refund)}
          </p>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">New Return</p>
            <p className="text-xs text-muted-foreground mt-1">
              Find an invoice to start a refund
            </p>
          </div>
          <NewReturnButton sales={sales} returnedQtyMap={returnedQtyMap} onPick={setOpenSale} />
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search return no, invoice or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Refund</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.returnNo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(r.date)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.invoiceNo}</TableCell>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell className="text-right">
                    {r.items.reduce((a, i) => a + i.qty, 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {formatCurrency(r.refundAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.refundMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {r.reason}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReturns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      icon={Undo2}
                      title="No returns yet"
                      description={`Click "New Return" to refund items from a past invoice.`}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ReturnDialog
        sale={openSale}
        returnedQtyMap={returnedQtyMap}
        onClose={() => setOpenSale(null)}
        onSubmit={async (payload) => {
          const r = await createReturn(payload);
          if (r) {
            toast.success(`Refund processed: ${formatCurrency(r.refundAmount)}`);
            setOpenSale(null);
          } else {
            toast.error("Could not create return");
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="Delete this return?"
        description="The refund record will be removed and any restocked items will be deducted from inventory."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirmDeleteId) {
            await deleteReturn(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />
    </div>
  );
}

function NewReturnButton({
  sales,
  returnedQtyMap,
  onPick,
}: {
  sales: Sale[];
  returnedQtyMap: Map<string, Map<string, number>>;
  onPick: (s: Sale) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.toLowerCase();
    return sales
      .filter((s) => {
        const used = returnedQtyMap.get(s.id);
        const totalReturned = used
          ? Array.from(used.values()).reduce((a, b) => a + b, 0)
          : 0;
        const totalSold = s.items.reduce((a, i) => a + i.qty, 0);
        if (totalReturned >= totalSold) return false;
        if (!term) return true;
        return (
          s.invoiceNo.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term)
        );
      })
      .slice(0, 50);
  }, [sales, q, returnedQtyMap]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="h-4 w-4 mr-1.5" /> New Return
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Find invoice to refund</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by invoice no or customer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto border rounded-md divide-y">
            {list.map((s) => (
              <button
                key={s.id}
                className="w-full text-left p-3 hover:bg-muted/50 flex items-center justify-between"
                onClick={() => {
                  onPick(s);
                  setOpen(false);
                }}
              >
                <div>
                  <div className="font-medium">{s.invoiceNo}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(s.date)} · {s.customerName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(s.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.items.reduce((a, i) => a + i.qty, 0)} items
                  </div>
                </div>
              </button>
            ))}
            {list.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No refundable invoices found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReturnDialog({
  sale,
  returnedQtyMap,
  onClose,
  onSubmit,
}: {
  sale: Sale | null;
  returnedQtyMap: Map<string, Map<string, number>>;
  onClose: () => void;
  onSubmit: (p: {
    saleId: string;
    items: Array<{ productId: string; qty: number; restock: boolean }>;
    refundMethod: RefundMethod;
    restockingFee: number;
    reason: string;
    note?: string;
    refundAccountId?: string | null;
  }) => void;
}) {
  const accounts = useActiveAccounts();
  const balances = useAccountBalances();
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [restockMap, setRestockMap] = useState<Record<string, boolean>>({});
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("Cash");
  const [refundAccountId, setRefundAccountId] = useState<string>("");
  const [reason, setReason] = useState("Customer changed mind");
  const [note, setNote] = useState("");
  const [restockingFee, setRestockingFee] = useState(0);

  const reset = () => {
    setQtyMap({});
    setRestockMap({});
    setReason("Customer changed mind");
    setNote("");
    setRestockingFee(0);
    setRefundMethod("Cash");
  };

  const lines = useMemo(() => {
    if (!sale) return [];
    const used = returnedQtyMap.get(sale.id) ?? new Map();
    return sale.items.map((i) => {
      const already = used.get(i.productId) ?? 0;
      const maxQty = Math.max(0, i.qty - already);
      return { ...i, already, maxQty };
    });
  }, [sale, returnedQtyMap]);

  const subtotal = useMemo(() => {
    if (!sale) return 0;
    return lines.reduce((s, l) => {
      const q = Math.min(qtyMap[l.productId] ?? 0, l.maxQty);
      return s + q * l.price;
    }, 0);
  }, [lines, qtyMap, sale]);

  const refundAmount = Math.max(0, subtotal - Math.min(restockingFee, subtotal));

  if (!sale) return null;

  return (
    <Dialog
      open={!!sale}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" /> Return for {sale.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {sale.customerName} · {formatDateTime(sale.date)} · Total {formatCurrency(sale.total)}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right w-20">Sold</TableHead>
                  <TableHead className="text-right w-20">Done</TableHead>
                  <TableHead className="text-right w-24">Return</TableHead>
                  <TableHead className="text-center w-24">Restock?</TableHead>
                  <TableHead className="text-right w-24">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => {
                  const q = qtyMap[l.productId] ?? 0;
                  return (
                    <TableRow key={l.productId} className={l.maxQty === 0 ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(l.price)}</div>
                      </TableCell>
                      <TableCell className="text-right">{l.qty}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{l.already}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={l.maxQty}
                          value={q || ""}
                          disabled={l.maxQty === 0}
                          onChange={(e) => {
                            const v = Math.min(Math.max(0, Number(e.target.value) || 0), l.maxQty);
                            setQtyMap((m) => ({ ...m, [l.productId]: v }));
                            if (v > 0 && restockMap[l.productId] === undefined) {
                              setRestockMap((m) => ({ ...m, [l.productId]: true }));
                            }
                          }}
                          className="h-8 w-20 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          disabled={q === 0}
                          checked={restockMap[l.productId] ?? true}
                          onCheckedChange={(v) =>
                            setRestockMap((m) => ({ ...m, [l.productId]: !!v }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Math.min(q, l.maxQty) * l.price)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Refund Method</Label>
              <Select
                value={refundMethod}
                onValueChange={(v) => {
                  const m = v as RefundMethod;
                  setRefundMethod(m);
                  if (m === "Store Credit") {
                    setRefundAccountId("");
                  } else {
                    const type: AccountType =
                      m === "Cash" ? "cash" : m === "Mobile Banking" ? "mobile_banking" : "bank";
                    const def =
                      accounts.find((a) => a.type === type && a.isDefault) ??
                      accounts.find((a) => a.type === type);
                    setRefundAccountId(def?.id ?? "");
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                  <SelectItem value="Store Credit">Store Credit (loyalty)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Refund From Account</Label>
              {refundMethod === "Store Credit" ? (
                <p className="text-xs text-muted-foreground border rounded-md p-2">
                  Store Credit — কোনো cash account লাগবে না।
                </p>
              ) : accounts.length === 0 ? (
                <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-2">
                  No active account. Add one first.
                </p>
              ) : (
                <Select value={refundAccountId} onValueChange={setRefundAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => {
                        const type: AccountType =
                          refundMethod === "Cash" ? "cash" : refundMethod === "Mobile Banking" ? "mobile_banking" : "bank";
                        return a.type === type;
                      })
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} · {ACCOUNT_TYPE_LABEL[a.type]} · {formatCurrency(balances[a.id] ?? 0)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Restocking Fee</Label>
              <Input
                type="number"
                min={0}
                value={restockingFee || ""}
                onChange={(e) => setRestockingFee(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer changed mind">Customer changed mind</SelectItem>
                  <SelectItem value="Defective product">Defective product</SelectItem>
                  <SelectItem value="Wrong item delivered">Wrong item delivered</SelectItem>
                  <SelectItem value="Damaged in transit">Damaged in transit</SelectItem>
                  <SelectItem value="Pricing error">Pricing error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal notes…"
                rows={2}
              />
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Returned subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restocking fee</span>
              <span className="font-medium">- {formatCurrency(Math.min(restockingFee, subtotal))}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2 font-bold text-base">
              <span>Refund Amount</span>
              <span className="text-destructive">{formatCurrency(refundAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            disabled={refundAmount === 0}
            onClick={() => {
              const items = Object.entries(qtyMap)
                .filter(([, q]) => q > 0)
                .map(([productId, qty]) => ({
                  productId,
                  qty,
                  restock: restockMap[productId] ?? true,
                }));
              if (items.length === 0) return;
              onSubmit({
                saleId: sale.id,
                items,
                refundMethod,
                restockingFee,
                reason,
                note: note.trim() || undefined,
                refundAccountId: refundMethod === "Store Credit" ? null : (refundAccountId || null),
              });
              reset();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Undo2 className="h-4 w-4 mr-1.5" /> Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
