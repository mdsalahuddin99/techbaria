"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { Plus, Search, Pencil, Trash2, Truck, Wallet, Receipt } from "lucide-react";
import { Supplier, PaymentMethod, PurchaseOrder } from "@/shared/lib/types";
import { FinancialAccount, LedgerTransaction } from "@/features/accounts/types";
import { toast } from "sonner";
import { PageHeader, EmptyState, ConfirmDialog } from "@/shared/components";
import {
  useDeleteSupplier, useRecordSupplierPayment,
  useInfiniteSuppliersQuery, useSupplierDeposit, useSupplierWithdraw,
} from "@/features/suppliers/hooks";
import { SupplierFormDialog } from "@/features/suppliers/SupplierFormDialog";
import { usePurchases } from "@/features/purchases/hooks";
import { SupplierLedger } from "@/features/suppliers/components/SupplierLedger";
import { flattenAccountsGroupedByType } from "@/features/accounts/tree";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/features/accounts/types";
import { useActiveAccounts, useAccountBalances } from "@/features/accounts/hooks";

const methodFromAccountType = (t?: AccountType): PaymentMethod =>
  t === "bank" ? "Card" : t === "mobile_banking" ? "Mobile Banking" : "Cash";

export function SuppliersClient({
  initialSuppliers,
  initialPurchases,
  initialAccounts,
  initialLedger,
}: {
  initialSuppliers: Supplier[];
  initialPurchases: PurchaseOrder[];
  initialAccounts: FinancialAccount[];
  initialLedger: LedgerTransaction[];
}) {
  usePageTitle("Suppliers");
  const purchases = usePurchases(initialPurchases);
  const deleteMutation = useDeleteSupplier();
  const payMutation = useRecordSupplierPayment();
  const depositMutation = useSupplierDeposit();
  const withdrawMutation = useSupplierWithdraw();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryFilter = useMemo(() => ({
    search: debouncedSearch,
  }), [debouncedSearch]);

  const initialInfiniteData = useMemo(() => {
    return {
      pages: [{ items: initialSuppliers, nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    };
  }, [initialSuppliers]);

  const isFilterEmpty = !queryFilter.search;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteSuppliersQuery(
    queryFilter,
    isFilterEmpty ? initialInfiniteData : undefined
  );

  const suppliers = useMemo(() => {
    if (!data) return initialSuppliers;
    return data.pages.flatMap((page: any) => page.items) as Supplier[];
  }, [data, initialSuppliers]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [payOpen, setPayOpen] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<AccountType | "">("");
  const [payAccountId, setPayAccountId] = useState<string>("");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [walletAction, setWalletAction] = useState<"deposit" | "withdraw">("deposit");

  const accounts = useActiveAccounts(initialAccounts);
  const accountsTree = useMemo(() => flattenAccountsGroupedByType(accounts), [accounts]);
  const balances = useAccountBalances(initialAccounts, initialLedger);
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.type === "cash" && a.isDefault)?.id
      ?? accounts.find((a) => a.type === "cash")?.id
      ?? accounts[0]?.id
      ?? "",
    [accounts]
  );
  const payAccount = accounts.find((a) => a.id === payAccountId);

  // filtered is now server-side, so suppliers is already filtered
  const filtered = suppliers;

  const totalPayable = suppliers.reduce((sum, s) => sum + s.payableBalance, 0);
  const totalPurchased = suppliers.reduce((sum, s) => sum + s.totalPurchased, 0);

  const openNew = () => { setEditing(null); setOpen(true); };

  useEffect(() => {
    const handleFocusSearch = () => {
      document.getElementById("suppliers-search-input")?.focus();
    };
    const handleAddSupplier = () => {
      openNew();
    };

    window.addEventListener("cmd:focus-supplier-search", handleFocusSearch);
    window.addEventListener("cmd:add-supplier", handleAddSupplier);

    return () => {
      window.removeEventListener("cmd:focus-supplier-search", handleFocusSearch);
      window.removeEventListener("cmd:add-supplier", handleAddSupplier);
    };
  }, []);
  const openEdit = (s: Supplier) => { setEditing(s); setOpen(true); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  // Initialise / re-init the pay dialog state when it opens.
  useEffect(() => {
    if (payOpen) {
      setPayMethod("");
      setPayAccountId("");
      setPayAmount(String(payOpen.payableBalance || ""));
      setPayNote("");
    }
  }, [payOpen]);

  const submitPayment = async () => {
    if (!payOpen) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!payAccountId) {
      toast.error("কোন account থেকে দিচ্ছেন select করুন");
      return;
    }
    
    // Check if it's a Wallet transaction or a Due Payment
    if (walletAction === "deposit") {
      await depositMutation.mutateAsync({
        supplierId: payOpen.id, amount, accountId: payAccountId, notes: payNote, date: new Date(payDate).toISOString(),
      });
    } else if (walletAction === "withdraw") {
      await withdrawMutation.mutateAsync({
        supplierId: payOpen.id, amount, accountId: payAccountId, notes: payNote, date: new Date(payDate).toISOString(),
      });
    } else {
      const method = methodFromAccountType(payAccount?.type);
      await payMutation.mutateAsync({
        supplierId: payOpen.id, amount, method, accountId: payAccountId, note: payNote, // note is without 's' here
      });
    }

    setPayOpen(null);
    setPayAmount("");
    setPayNote("");
  };

  const supplierPurchases = (id: string) => purchases.filter((p) => p.supplierId === id);
  const supplierPaymentList = (id: string) =>
    purchases.filter((p) => p.supplierId === id).flatMap((p) => p.payments ?? []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="Manage vendors, purchases, and outstanding payables."
        actions={
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />Add Supplier
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
              <p className="text-2xl font-bold">{suppliers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 grid place-items-center">
              <Receipt className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Purchased (lifetime)</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPurchased)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 grid place-items-center">
              <Wallet className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding Payable</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPayable)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="suppliers-search-input"
            placeholder="Search suppliers by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={suppliers.length === 0 ? "No suppliers yet" : "No suppliers match your search"}
            description={suppliers.length === 0 ? "Add your first supplier to start logging purchases." : "Try a different search term."}
            action={suppliers.length === 0 ? (
              <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />Add Supplier
              </Button>
            ) : null}
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="p-4 active:bg-secondary/40 transition-colors cursor-pointer"
                  onClick={() => setDetail(s)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetail(s); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.contactPerson || s.phone}</p>
                      {s.contactPerson && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatCurrency(s.totalPurchased)}</p>
                      {s.payableBalance > 0 && (
                        <Badge variant="outline" className="border-warning text-warning text-[10px] mt-1 mr-1">
                          Due {formatCurrency(s.payableBalance)}
                        </Badge>
                      )}
                      {(s.advanceBalance || 0) > 0 ? (
                        <Badge variant="outline" className="border-accent text-accent text-[10px] mt-1">
                          Wallet {formatCurrency(s.advanceBalance || 0)}
                        </Badge>
                      ) : s.payableBalance === 0 && (
                        <Badge variant="outline" className="border-accent text-accent text-[10px] mt-1">Cleared</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setWalletAction("deposit"); setPayOpen(s); }}>
                      <Wallet className="h-3.5 w-3.5 mr-1" />Wallet
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Total Purchased</TableHead>
                    <TableHead className="text-right">Payable</TableHead>
                    <TableHead className="text-right">Wallet</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.contactPerson || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.phone}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.totalPurchased)}</TableCell>
                      <TableCell className="text-right">
                        {s.payableBalance > 0 ? (
                          <Badge variant="outline" className="border-warning text-warning">
                            {formatCurrency(s.payableBalance)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">0.00</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(s.advanceBalance || 0) > 0 ? (
                          <Badge variant="outline" className="border-accent text-accent">
                            {formatCurrency(s.advanceBalance || 0)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">0.00</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => { setWalletAction("deposit"); setPayOpen(s); }} title="Wallet Deposit/Withdraw">
                          <Wallet className="h-3.5 w-3.5 mr-1" />Wallet
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(s.id)} aria-label={`Delete ${s.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {hasNextPage && fetchNextPage && (
              <div className="p-4 flex justify-center border-t">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading..." : "Load More Suppliers"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <SupplierFormDialog open={open} onOpenChange={setOpen} editing={editing} />

      {/* Wallet / Payment Dialog */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{payOpen?.name} - Wallet & Payments</DialogTitle>
            <DialogDescription>
              Payable Due: <span className="font-semibold text-warning mr-4">{payOpen && formatCurrency(payOpen.payableBalance)}</span>
              Advance Wallet: <span className="font-semibold text-accent">{payOpen && formatCurrency(payOpen.advanceBalance || 0)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 border-b pb-2 mb-2">
            <Button size="sm" variant={walletAction === "deposit" ? "default" : "outline"} onClick={() => setWalletAction("deposit")}>Deposit Advance</Button>
            <Button size="sm" variant={walletAction === "withdraw" ? "default" : "outline"} onClick={() => setWalletAction("withdraw")}>Withdraw Advance</Button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount (৳)</label>
              <Input type="number" autoFocus value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment Method *</label>
              <Select
                value={payMethod}
                onValueChange={(v) => {
                  setPayMethod(v as AccountType);
                  setPayAccountId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Method select করুন" />
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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Account *</label>
              {accounts.length === 0 ? (
                <div className="text-xs text-muted-foreground border rounded-md p-2">
                  Accounts page থেকে আগে account add করুন
                </div>
              ) : (
                <Select value={payAccountId} onValueChange={setPayAccountId} disabled={!payMethod}>
                  <SelectTrigger><SelectValue placeholder="Account select করুন" /></SelectTrigger>
                  <SelectContent>
                    {payMethod && accounts.filter(a => a.type === payMethod).map((a) => (
                      <SelectItem key={a.id} value={a.id} className="font-normal text-foreground">
                        {a.name} · {formatCurrency(balances[a.id] ?? 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note</label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submitPayment} loading={payMutation.isPending || depositMutation.isPending || withdrawMutation.isPending}>
              {walletAction === "deposit" ? "Deposit to Wallet" : walletAction === "withdraw" ? "Withdraw from Wallet" : "Record Payment"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this supplier?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.name}</SheetTitle>
            <SheetDescription>{detail?.address}</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Contact Person" value={detail.contactPerson || "—"} />
                <Info label="Phone" value={detail.phone} />
                <Info label="Email" value={detail.email || "—"} />
                <Info label="Joined" value={formatDate(detail.createdAt)} />
                <Info label="Total Purchased" value={formatCurrency(detail.totalPurchased)} />
                <Info label="Payable Due" value={formatCurrency(detail.payableBalance)} highlight={detail.payableBalance > 0} />
                <Info label="Wallet Advance" value={formatCurrency(detail.advanceBalance || 0)} highlight={(detail.advanceBalance || 0) > 0} />
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Purchase History</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPurchases(detail.id).map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>{formatDate(po.createdAt)}</TableCell>
                          <TableCell><Badge variant="secondary">{po.status}</Badge></TableCell>
                          <TableCell className="text-right">{formatCurrency(po.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                      {supplierPurchases(detail.id).length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No purchases yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  Wallet / Ledger History
                  <Badge variant="secondary" className="ml-auto font-mono">{formatCurrency(detail.advanceBalance || 0)} Advance</Badge>
                </h4>
                <SupplierLedger supplierId={detail.id} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
