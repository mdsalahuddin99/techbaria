"use client";

import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Search, Receipt, ArrowUpDown, FileText, Printer, Wallet } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components";
import { Customer, Sale } from "@/shared/lib/types";
import { useCustomerSales } from "@/features/sales/hooks";
import { CustomerBalanceCard } from "@/features/customers/CustomerBalanceCard";
import { CustomerLedger } from "@/features/customers/CustomerLedger";
import { InvoiceDueCollectDialog } from "@/features/sales/InvoiceDueCollectDialog";
import { BulkDueCollectDialog } from "@/features/customers/BulkDueCollectDialog";
import Invoice from "@/components/Invoice";
import { useSettings } from "@/features/settings/hooks";
import { useActiveAccounts } from "@/features/accounts/hooks";

interface CustomerHistorySheetProps {
  customer: Customer | null;
  onClose: () => void;
  onCollect: (c: Customer) => void;
}

export function CustomerHistorySheet({ customer, onClose, onCollect }: CustomerHistorySheetProps) {
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<"newest" | "oldest" | "total-desc" | "total-asc" | "due-desc" | "due-asc">("newest");
  const [invoicePreview, setInvoicePreview] = useState<Sale | null>(null);
  const [collectDueSale, setCollectDueSale] = useState<Sale | null>(null);
  const [showBulkCollect, setShowBulkCollect] = useState(false);
  
  const settings = useSettings();
  const accounts = useActiveAccounts();

  useEffect(() => {
    if (customer) {
      setHistorySearch("");
      setHistorySort("newest");
    }
  }, [customer]);

  const customerHistory = useCustomerSales(customer?.id);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    let list = q
      ? customerHistory.filter(
          (s) =>
            s.invoiceNo.toLowerCase().includes(q) ||
            s.paymentMethod.toLowerCase().includes(q) ||
            s.items.some((i) => i.name.toLowerCase().includes(q))
        )
      : customerHistory;
    list = list.slice().sort((a, b) => {
      switch (historySort) {
        case "newest": return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest": return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "total-desc": return b.total - a.total;
        case "total-asc": return a.total - b.total;
        case "due-desc": {
          const dueA = Math.max(0, a.total - a.amountPaid);
          const dueB = Math.max(0, b.total - b.amountPaid);
          return dueB - dueA;
        }
        case "due-asc": {
          const dueA = Math.max(0, a.total - a.amountPaid);
          const dueB = Math.max(0, b.total - b.amountPaid);
          return dueA - dueB;
        }
        default: return 0;
      }
    });
    return list;
  }, [customerHistory, historySearch, historySort]);

  return (
    <>
      <Sheet open={!!customer} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
          <div className="p-6 pb-2 shrink-0 border-b bg-background z-10">
            <SheetHeader>
              <SheetTitle>Purchase History</SheetTitle>
            </SheetHeader>
          </div>
          {customer && (
            <Tabs defaultValue="invoices" className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="px-6 pt-4 shrink-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="invoices">Invoices & Stats</TabsTrigger>
                  <TabsTrigger value="ledger">Ledger</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="invoices" className="flex-1 overflow-y-auto p-6 pt-4 m-0 space-y-4 outline-none">
                <div className="bg-secondary/60 rounded-lg p-4 border border-border/50">
                  <p className="font-semibold text-base text-slate-800">{customer.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>
                  {customer.email && (
                    <p className="text-sm text-slate-500">{customer.email}</p>
                  )}
                  <div className="grid grid-cols-4 gap-2 mt-4 text-center divide-x divide-border/50 border-t border-border/50 pt-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Orders</p>
                      <p className="font-bold text-slate-700">{customerHistory.length}{customerHistory.length >= 50 ? "+" : ""}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Spent</p>
                      <p className="font-bold text-emerald-600 text-sm">{formatCurrency(customer.totalSpent ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Due</p>
                      <p className={`font-bold text-sm ${(customer.due ?? 0) > 0 ? "text-orange-600" : "text-slate-700"}`}>
                        {formatCurrency(customer.due ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Points</p>
                      <p className="font-bold text-slate-700">{customer.loyaltyPoints}</p>
                    </div>
                  </div>
                </div>

                <CustomerBalanceCard customerId={customer.id} />

                {customerHistory.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No purchases yet"
                    description="This customer hasn't made any purchases."
                  />
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search invoices..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="pl-9 h-9 text-sm"
                        />
                      </div>
                      <Select value={historySort} onValueChange={(v) => setHistorySort(v as typeof historySort)}>
                        <SelectTrigger className="sm:w-40 h-9 text-sm">
                          <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                          <SelectItem value="total-desc">Total (high → low)</SelectItem>
                          <SelectItem value="total-asc">Total (low → high)</SelectItem>
                          <SelectItem value="due-desc">Due (high → low)</SelectItem>
                          <SelectItem value="due-asc">Due (low → high)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {filteredHistory.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-6">
                        কোনো ইনভয়েস match করেনি।
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filteredHistory.map((s) => {
                          const due = Math.max(0, s.total - s.amountPaid);
                          return (
                            <div key={s.id} className="border rounded-lg p-3.5 bg-card hover:border-border/80 transition-colors shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-mono text-sm font-semibold truncate text-slate-800">{s.invoiceNo}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(s.date)}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold text-slate-800">{formatCurrency(s.total)}</p>
                                  <Badge variant="secondary" className="text-[10px] mt-1 bg-slate-100 text-slate-600 font-medium">{s.paymentMethod}</Badge>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                <span className="font-medium text-slate-700">{s.items.reduce((a, i) => a + i.qty, 0)} items</span> ·{" "}
                                {s.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                              </div>
                              {due > 0 && (
                                <div className="mt-2.5 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-100">
                                  Due: {formatCurrency(due)}
                                </div>
                              )}
                              <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs flex-1 hover:bg-slate-100"
                                  onClick={() => setInvoicePreview(s)}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-400" />View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs flex-1 hover:bg-slate-100"
                                  onClick={() => setInvoicePreview(s)}
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-400" />Reprint
                                </Button>
                                {due > 0 && (
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs flex-1 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 shadow-none border-0"
                                    onClick={() => setCollectDueSale(s)}
                                  >
                                    <Wallet className="h-3.5 w-3.5 mr-1.5" />Pay Due
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ledger" className="flex-1 overflow-y-auto p-6 pt-4 m-0 outline-none">
                <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transaction Ledger</p>
                  </div>
                  <CustomerLedger customerId={customer.id} />
                </div>
              </TabsContent>

              {/* Pinned Action Buttons */}
              <div className="shrink-0 p-4 border-t bg-background shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)] z-10">
                <div className="flex gap-3 flex-wrap">
                  {customer.due > 0 && (
                    <Button 
                      className="flex-1 min-w-[120px] bg-orange-600 text-white hover:bg-orange-700 h-10 shadow-sm"
                      onClick={() => setShowBulkCollect(true)}
                    >
                      <Wallet className="h-4 w-4 mr-2" />Bulk Collect Due
                    </Button>
                  )}
                  <Button 
                    className="flex-1 min-w-[120px] bg-emerald-600 text-white hover:bg-emerald-700 h-10 shadow-sm"
                    onClick={() => onCollect(customer)}
                  >
                    <Wallet className="h-4 w-4 mr-2" />Add Wallet Funds
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 min-w-[100px] h-10 bg-white"
                    onClick={onClose}
                  >
                    <Receipt className="h-4 w-4 mr-2 text-slate-500" />Close
                  </Button>
                </div>
              </div>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <InvoiceDueCollectDialog
        open={!!collectDueSale}
        onOpenChange={(open) => !open && setCollectDueSale(null)}
        sale={collectDueSale}
        accounts={accounts}
      />

      {customer && (
        <BulkDueCollectDialog
          open={showBulkCollect}
          onOpenChange={setShowBulkCollect}
          customer={{
            id: customer.id,
            name: customer.name,
            due: customer.due ?? 0,
            balance: customer.balance ?? 0,
          }}
        />
      )}

      <Invoice
        sale={invoicePreview}
        settings={settings}
        open={!!invoicePreview}
        onClose={() => setInvoicePreview(null)}
      />
    </>
  );
}
