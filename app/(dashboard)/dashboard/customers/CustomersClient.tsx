"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/shared/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { Plus, Search, Pencil, Trash2, Users, History, Receipt, Wallet, FileText, Printer, ArrowUpDown } from "lucide-react";
import { Customer, Sale } from "@/shared/lib/types";
import { toast } from "sonner";
import { PageHeader, EmptyState, ConfirmDialog } from "@/shared/components";
import { useInfiniteCustomersQuery, useDeleteCustomer } from "@/features/customers/hooks";
import { CustomerFormDialog } from "@/features/customers/CustomerFormDialog";
import { useSales } from "@/features/sales/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useActiveAccounts } from "@/features/accounts/hooks";
import { CustomerBalanceCard } from "@/features/customers/CustomerBalanceCard";
import { CustomerLedger } from "@/features/customers/CustomerLedger";
import { CustomerWalletDialog } from "@/features/customers/CustomerWalletDialog";
import Invoice from "@/components/Invoice";

type Group = Customer["group"];

export function CustomersClient({
  initialCustomers,
  initialSales,
  initialAccounts,
}: {
  initialCustomers: Customer[];
  initialSales: Sale[];
  initialAccounts: any[];
}) {
  usePageTitle("Customers");
  const deleteMutation = useDeleteCustomer();
  const { data: allSales } = useSales(initialSales);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [dueFilter, setDueFilter] = useState<"all" | "with-due" | "no-due">("all");
  type SortKey = "name" | "due" | "totalSpent" | "loyalty" | "joined";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  
  const queryFilter = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    dueFilter: dueFilter !== "all" ? dueFilter : undefined,
    sortKey,
    sortDir,
  }), [debouncedSearch, dueFilter, sortKey, sortDir]);

  const initialInfiniteData = useMemo(() => {
    return {
      pages: [{ items: initialCustomers, nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    };
  }, [initialCustomers]);

  const isFilterEmpty = !queryFilter.search && !queryFilter.dueFilter && queryFilter.sortKey === "name" && queryFilter.sortDir === "asc";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteCustomersQuery(
    queryFilter,
    isFilterEmpty ? initialInfiniteData : undefined
  );

  const customers = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? initialCustomers;
  }, [data, initialCustomers]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc"); }
  };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Customer | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<"newest" | "oldest" | "total-desc" | "total-asc" | "due-desc" | "due-asc">("newest");
  const [invoicePreview, setInvoicePreview] = useState<Sale | null>(null);
  const [collectFor, setCollectFor] = useState<Customer | null>(null);
  const settings = useSettings();

  const accounts = useActiveAccounts(initialAccounts);

  useEffect(() => {
    if (historyFor) {
      setHistorySearch("");
      setHistorySort("newest");
    }
  }, [historyFor]);

  const customerHistory = useMemo(() => {
    if (!historyFor) return [];
    return allSales.filter((s) => s.customerId === historyFor.id);
  }, [allSales, historyFor]);

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
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "total-desc":
          return b.total - a.total;
        case "total-asc":
          return a.total - b.total;
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
        default:
          return 0;
      }
    });
    return list;
  }, [customerHistory, historySearch, historySort]);

  const historyTotals = useMemo(() => {
    const totalSpent = customerHistory.reduce((s, x) => s + x.total, 0);
    const totalPaid = customerHistory.reduce((s, x) => s + Math.min(x.amountPaid, x.total), 0);
    return { totalSpent, totalDue: Math.max(0, totalSpent - totalPaid) };
  }, [customerHistory]);

  const filtered = customers;

  const dueCount = useMemo(
    () => customers.filter((c) => (c.due ?? 0) > 0).length,
    [customers],
  );

  const filteredDue = useMemo(
    () => customers.filter((c) => (c.due ?? 0) > 0),
    [customers],
  );

  const openNew = () => { setEditing(null); setOpen(true); };

  useEffect(() => {
    const handleFocusSearch = () => {
      document.getElementById("customers-search-input")?.focus();
    };
    const handleAddCustomer = () => {
      openNew();
    };

    window.addEventListener("cmd:focus-customer-search", handleFocusSearch);
    window.addEventListener("cmd:add-customer", handleAddCustomer);

    return () => {
      window.removeEventListener("cmd:focus-customer-search", handleFocusSearch);
      window.removeEventListener("cmd:add-customer", handleAddCustomer);
    };
  }, []);
  const openEdit = (c: Customer) => { setEditing(c); setOpen(true); };

  const groupColor = (g: Group) =>
    g === "Technician" ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : g === "Wholesale" ? "bg-accent text-accent-foreground"
    : "bg-secondary text-secondary-foreground";

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="Track buyers, loyalty points, and group pricing."
        actions={
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />Add Customer
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="customers-search-input"
              placeholder="Search by name, phone or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as typeof dueFilter)}>
            <SelectTrigger className="sm:w-56">
              <Wallet className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              <SelectItem value="with-due">With due</SelectItem>
              <SelectItem value="no-due">No due</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={`${sortKey}:${sortDir}`}
            onValueChange={(v) => {
              const [k, d] = v.split(":") as [SortKey, SortDir];
              setSortKey(k);
              setSortDir(d);
            }}
          >
            <SelectTrigger className="sm:w-56">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name:asc">Name (A → Z)</SelectItem>
              <SelectItem value="name:desc">Name (Z → A)</SelectItem>
              <SelectItem value="totalSpent-desc">Total Spent (high → low)</SelectItem>
              <SelectItem value="totalSpent-asc">Total Spent (low → high)</SelectItem>
              <SelectItem value="loyalty:desc">Loyalty (high → low)</SelectItem>
              <SelectItem value="joined:desc">Newest joined</SelectItem>
              <SelectItem value="joined:asc">Oldest joined</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={customers.length === 0 ? "No customers yet" : "No customers match your search"}
            description={customers.length === 0 ? "Add a customer to start tracking sales and loyalty." : "Try a different search term."}
            action={customers.length === 0 ? (
              <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />Add Customer
              </Button>
            ) : null}
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="w-full text-left p-4 active:bg-secondary/40 transition-colors cursor-pointer"
                  onClick={() => setHistoryFor(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setHistoryFor(c); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{c.name}</p>
                        <Badge className={`${groupColor(c.group)} text-[10px] px-1.5 py-0`}>{c.group}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{c.phone}</p>
                      {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary text-sm">{formatCurrency(c.totalSpent)}</p>
                      <p className="text-[11px] text-muted-foreground">{c.loyaltyPoints} pts</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 mt-2 -mb-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setCollectFor(c)}>
                      <Wallet className="h-3.5 w-3.5 mr-1" /> Collect
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setHistoryFor(c)}>
                      <History className="h-3.5 w-3.5 mr-1" /> History
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {c.id !== "c1" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive ml-auto" onClick={() => setDeleteId(c.id)} aria-label={`Delete ${c.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table variant="premium">
                <TableHeader>
                  <TableRow>
                    {([
                      ["name", "Name", "left"],
                      [null, "Phone", "left"],
                      [null, "Email", "left"],
                      [null, "Group", "left"],
                      ["totalSpent", "Total Spent", "right"],
                      ["loyalty", "Loyalty", "right"],
                      ["joined", "Joined", "left"],
                    ] as Array<[SortKey | null, string, "left" | "right"]>).map(
                      ([key, label, align], i) => (
                        <TableHead
                          key={i}
                          className={align === "right" ? "text-right" : ""}
                        >
                          {key ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(key)}
                              className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
                                sortKey === key ? "text-foreground font-semibold" : ""
                              }`}
                            >
                              {label}
                              <ArrowUpDown className="h-3 w-3 opacity-60" />
                              {sortKey === key && (
                                <span className="text-[10px]">
                                  {sortDir === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </button>
                          ) : (
                            label
                          )}
                        </TableHead>
                      ),
                    )}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setHistoryFor(c)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                      <TableCell><Badge className={groupColor(c.group)}>{c.group}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(c.totalSpent)}</TableCell>
                      <TableCell className="text-right">{c.loyaltyPoints} pts</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(c.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="mr-1 h-8" onClick={() => setCollectFor(c)}>
                          <Wallet className="h-3.5 w-3.5 mr-1" />Collect
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setHistoryFor(c)} aria-label={`View ${c.name} history`} title="Purchase history">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {c.id !== "c1" && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(c.id)} aria-label={`Delete ${c.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {hasNextPage && (
              <div className="flex justify-center mt-6 mb-2">
                <Button 
                  variant="outline" 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="bg-white"
                >
                  {isFetchingNextPage ? "Loading more..." : "Load More Customers"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Due Table (customers with due > 0) ── */}
      {filteredDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-warning" />
              Due Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table variant="premium">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Due Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDue.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="text-right text-warning font-semibold">{formatCurrency(c.due ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setCollectFor(c)}>
                        <Wallet className="h-3.5 w-3.5 mr-1" />Collect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CustomerFormDialog open={open} onOpenChange={setOpen} editing={editing} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this customer?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />

      <Sheet open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Purchase History</SheetTitle>
          </SheetHeader>
          {historyFor && (
            <div className="mt-4 space-y-4">
              <div className="bg-secondary/60 rounded-lg p-4">
                <p className="font-semibold text-base">{historyFor.name}</p>
                <p className="text-sm text-muted-foreground">{historyFor.phone}</p>
                {historyFor.email && (
                  <p className="text-sm text-muted-foreground">{historyFor.email}</p>
                )}
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Orders</p>
                    <p className="font-bold">{customerHistory.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Spent</p>
                    <p className="font-bold text-primary text-sm">{formatCurrency(historyTotals.totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Due</p>
                    <p className={`font-bold text-sm ${historyTotals.totalDue > 0 ? "text-warning" : ""}`}>
                      {formatCurrency(historyTotals.totalDue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Points</p>
                    <p className="font-bold">{historyFor.loyaltyPoints}</p>
                  </div>
                </div>
              </div>

              {/* ── Ledger Section ── */}
              <CustomerBalanceCard customerId={historyFor.id} />
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 h-10"
                  onClick={() => { setCollectFor(historyFor); }}
                >
                  <Wallet className="h-4 w-4 mr-2" />Wallet
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-10"
                  onClick={() => {
                    setHistoryFor(null);
                    // Open add sale with this customer pre-selected
                  }}
                >
                  <Receipt className="h-4 w-4 mr-2" />New Sale
                </Button>
              </div>

              <div className="border rounded-lg">
                <div className="px-3 py-2 border-b bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction History</p>
                </div>
                <CustomerLedger customerId={historyFor.id} />
              </div>

              {customerHistory.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No purchases yet"
                  description="This customer hasn't made any purchases."
                />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search invoice, item or method…"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                    <Select value={historySort} onValueChange={(v) => setHistorySort(v as typeof historySort)}>
                      <SelectTrigger className="sm:w-44 h-10">
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
                    <div className="space-y-2">
                      {filteredHistory.map((s) => {
                        const due = Math.max(0, s.total - s.amountPaid);
                        return (
                          <div key={s.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-sm font-semibold truncate">{s.invoiceNo}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(s.date)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-primary">{formatCurrency(s.total)}</p>
                                <Badge variant="secondary" className="text-[10px]">{s.paymentMethod}</Badge>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {s.items.reduce((a, i) => a + i.qty, 0)} items ·{" "}
                              {s.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                            </div>
                            {due > 0 && (
                              <p className="text-[11px] mt-1 text-warning font-semibold">
                                Due {formatCurrency(due)}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs flex-1"
                                onClick={() => setInvoicePreview(s)}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs flex-1"
                                onClick={() => setInvoicePreview(s)}
                              >
                                <Printer className="h-3.5 w-3.5 mr-1" />Reprint
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Customer Wallet Dialog */}
      <CustomerWalletDialog
        open={!!collectFor}
        onOpenChange={(o) => !o && setCollectFor(null)}
        customerId={collectFor?.id ?? ""}
        customerName={collectFor?.name ?? ""}
        currentBalance={collectFor?.balance ?? 0}
        accounts={accounts}
      />

      <Invoice
        sale={invoicePreview}
        settings={settings}
        open={!!invoicePreview}
        onClose={() => setInvoicePreview(null)}
      />
    </div>
  );
}
