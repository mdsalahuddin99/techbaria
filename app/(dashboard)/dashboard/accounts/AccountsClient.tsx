"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { useCustomers } from "@/features/customers/hooks";
import { useSuppliers } from "@/features/suppliers/hooks";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import {
  Banknote, Lock, Unlock, TrendingUp, TrendingDown, Plus, ArrowLeftRight,
  Pencil, Star, Wallet, Landmark, Smartphone, Archive,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/shared/components";
import {
  useShifts, useActiveShift, useShiftActions, useExpectedCash,
  useAccounts, useActiveAccounts, useAccountBalances, useAccountsByTypeTotals,
  useLedger, useAccountActions,
} from "@/features/accounts/hooks";
import {
  ACCOUNT_TYPE_LABEL, type AccountType, type FinancialAccount,
  type LedgerCategory,
} from "@/features/accounts/types";
import { AccountFormDialog } from "@/features/accounts/AccountFormDialog";
import { TransferDialog } from "@/features/accounts/TransferDialog";
import { flattenAccountTree } from "@/features/accounts/tree";

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  mobile_banking: Smartphone,
};

const CATEGORY_LABEL: Record<LedgerCategory, string> = {
  opening: "Opening",
  sale: "Sale",
  sale_refund: "Refund",
  due_collection: "Due Collected",
  supplier_payment: "Supplier Paid",
  purchase_payment: "Purchase Paid",
  expense: "Expense",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  deposit: "Deposit",
  withdraw: "Withdraw",
  adjustment: "Adjustment",
};

export function AccountsClient({
  initialCustomers,
  initialSuppliers,
  initialAccounts,
  initialLedger,
}: {
  initialCustomers: any[];
  initialSuppliers: any[];
  initialAccounts: any[];
  initialLedger: any[];
}) {
  usePageTitle("Accounts");
  const { data: customers } = useCustomers(initialCustomers);
  const { data: suppliers } = useSuppliers(initialSuppliers);

  // Shift state (legacy cash register)
  const shifts = useShifts();
  const activeShift = useActiveShift();
  const expectedCash = useExpectedCash();
  const { open: openShift, close: closeShift } = useShiftActions();

  // Accounts state
  const accounts = useAccounts(initialAccounts);
  const activeAccounts = useActiveAccounts(initialAccounts);
  const balances = useAccountBalances(initialAccounts, initialLedger);
  const totals = useAccountsByTypeTotals(initialAccounts, initialLedger);
  const { archiveAccount, setDefaultAccount } = useAccountActions();

  // Dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingCount, setClosingCount] = useState("");
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  // Ledger view
  const [ledgerAccountId, setLedgerAccountId] = useState<string>("");
  const [ledgerCategory, setLedgerCategory] = useState<string>("All");
  const ledgerAll = useLedger(undefined, initialLedger);
  const ledger = useLedger(ledgerAccountId || undefined, initialLedger);
  const filteredLedger = useMemo(
    () => (ledgerCategory === "All" ? ledger : ledger.filter((t) => t.category === ledgerCategory)),
    [ledger, ledgerCategory]
  );

  const cashSalesSinceOpen = activeShift ? Math.max(0, expectedCash - activeShift.openingBalance) : 0;
  const totalReceivable = customers.reduce((s, c) => s + (c.due ?? 0), 0);
  const totalPayable = suppliers.reduce((s, sup) => s + sup.payableBalance, 0);
  const grandTotal = totals.cash + totals.bank + totals.mobile_banking;

  const handleOpen = async () => {
    const bal = Number(openingBalance);
    if (bal < 0 || isNaN(bal)) return toast.error("Enter a valid amount");
    try {
      await openShift(bal);
      toast.success("Cash drawer opened");
      setOpenDialog(false); setOpeningBalance("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open shift");
    }
  };
  const handleClose = async () => {
    const count = Number(closingCount);
    if (isNaN(count) || count < 0) return toast.error("Enter a valid count");
    try {
      await closeShift(count);
      toast.success("Cash drawer closed");
      setCloseDialog(false); setClosingCount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close shift");
    }
  };

  const onArchiveAccount = (a: FinancialAccount) => {
    if ((balances[a.id] ?? 0) !== 0) {
      return toast.error(`${a.name} এর balance শূন্য নয় — আগে transfer/withdraw করুন`);
    }
    archiveAccount(a.id);
    toast.success(`${a.name} archived`);
  };

  const renderAccountCard = (a: FinancialAccount, depth = 0) => {
    const Icon = TYPE_ICON[a.type];
    const bal = balances[a.id] ?? 0;
    const isSub = depth > 0;
    const parent = isSub ? accounts.find((p) => p.id === a.parentId) : null;
    return (
      <Card
        key={a.id}
        className={`p-4 flex flex-col gap-3 ${isSub ? "border-l-4 border-l-primary/40 bg-muted/30" : ""}`}
        style={isSub ? { marginLeft: `${depth * 12}px` } : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isSub && <span className="text-muted-foreground">↳</span>}
                <p className="font-semibold leading-tight">{a.name}</p>
                {a.isDefault && (
                  <Badge variant="outline" className="text-[10px] border-accent text-accent">
                    <Star className="h-3 w-3 mr-1" />Default
                  </Badge>
                )}
                {isSub && parent && (
                  <Badge variant="secondary" className="text-[10px]">
                    Sub of {parent.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {ACCOUNT_TYPE_LABEL[a.type]}
                {a.details?.bankName && ` · ${a.details.bankName}`}
                {a.details?.provider && ` · ${a.details.provider}`}
                {a.details?.accountNumber && ` · ${a.details.accountNumber}`}
                {a.details?.walletNumber && ` · ${a.details.walletNumber}`}
              </p>
            </div>
          </div>
        </div>
        <div className="text-2xl font-bold text-primary">{formatCurrency(bal)}</div>
        <div className="flex flex-wrap gap-1">
          {!a.isDefault && (
            <Button size="sm" variant="ghost" onClick={() => { setDefaultAccount(a.id); toast.success("Default updated"); }}>
              <Star className="h-3.5 w-3.5 mr-1" />Default
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => { setEditingAccount(a); setAccountFormOpen(true); }}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onArchiveAccount(a)}>
            <Archive className="h-3.5 w-3.5 mr-1" />Archive
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setLedgerAccountId(a.id)}>
            View ledger →
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Accounts"
        description="Cash, Bank ও Mobile Banking — সব account ও ledger transaction এক জায়গায়।"
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="register">Cash Register</TabsTrigger>
          <TabsTrigger value="receivable">Receivable</TabsTrigger>
          <TabsTrigger value="payable">Payable</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(["cash", "bank", "mobile_banking"] as AccountType[]).map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <Card key={t} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[t]}</p>
                      <p className="text-2xl font-bold">{formatCurrency(totals[t])}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
            <Card className="p-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <p className="text-xs opacity-80">Grand Total</p>
              <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
            </Card>
          </div>

          <Card>
            <div className="p-3 border-b font-semibold text-sm flex items-center justify-between">
              <span>Recent Transactions</span>
              <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="h-4 w-4 mr-1" />Transfer / Deposit
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerAll.slice(0, 15).map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{formatDateTime(tx.date)}</TableCell>
                      <TableCell className="text-sm">{acc?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{CATEGORY_LABEL[tx.category]}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.note ?? "—"}</TableCell>
                      <TableCell className="text-right text-accent">
                        {tx.direction === "in" ? formatCurrency(tx.amount) : ""}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {tx.direction === "out" ? formatCurrency(tx.amount) : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {ledgerAll.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    এখনো কোনো transaction নেই।
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ACCOUNTS */}
        <TabsContent value="accounts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {activeAccounts.length} active account · {accounts.length - activeAccounts.length} archived
            </p>
            <Button
              onClick={() => { setEditingAccount(null); setAccountFormOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />New Account
            </Button>
          </div>
          {(["cash", "bank", "mobile_banking"] as AccountType[]).map((t) => {
            const list = activeAccounts.filter((a) => a.type === t);
            if (list.length === 0) return null;
            const tree = flattenAccountTree(list);
            return (
              <div key={t} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {ACCOUNT_TYPE_LABEL[t]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tree.map((n) => renderAccountCard(n.account, n.depth))}
                </div>
              </div>
            );
          })}
          {activeAccounts.length === 0 && (
            <EmptyState icon={Wallet} title="No accounts" description="Create your first account to start tracking." />
          )}
        </TabsContent>

        {/* LEDGER */}
        <TabsContent value="ledger" className="space-y-3 mt-4">
          <Card className="p-3 flex flex-col sm:flex-row gap-2">
            <Select value={ledgerAccountId || "ALL"} onValueChange={(v) => setLedgerAccountId(v === "ALL" ? "" : v)}>
              <SelectTrigger className="sm:w-72"><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All accounts</SelectItem>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {ACCOUNT_TYPE_LABEL[a.type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ledgerCategory} onValueChange={setLedgerCategory}>
              <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All categories</SelectItem>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="ml-auto" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-1" />Transfer / Deposit
            </Button>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{formatDateTime(tx.date)}</TableCell>
                      <TableCell className="text-sm">{acc?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{CATEGORY_LABEL[tx.category]}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.note ?? "—"}</TableCell>
                      <TableCell className="text-right text-accent">
                        {tx.direction === "in" ? formatCurrency(tx.amount) : ""}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {tx.direction === "out" ? formatCurrency(tx.amount) : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(tx.balanceAfter)}</TableCell>
                    </TableRow>
                  );
                })}
                {filteredLedger.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No transactions match this filter.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* CASH REGISTER (legacy) */}
        <TabsContent value="register" className="space-y-4 mt-4">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg grid place-items-center ${activeShift ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>
                  {activeShift ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash drawer</p>
                  <p className="text-xl font-bold">{activeShift ? "Open" : "Closed"}</p>
                </div>
              </div>
              {activeShift ? (
                <Button onClick={() => { setClosingCount(String(expectedCash)); setCloseDialog(true); }} variant="outline">
                  <Lock className="h-4 w-4 mr-2" />Close Shift
                </Button>
              ) : (
                <Button onClick={() => setOpenDialog(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Unlock className="h-4 w-4 mr-2" />Open Shift
                </Button>
              )}
            </div>
            {activeShift && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <Stat label="Opened at" value={formatDateTime(activeShift.openedAt)} />
                <Stat label="Opening balance" value={formatCurrency(activeShift.openingBalance)} />
                <Stat label="Cash sales since" value={formatCurrency(cashSalesSinceOpen)} />
                <div className="sm:col-span-3 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-md p-3">
                  <span className="text-sm font-medium">Expected cash in drawer</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(expectedCash)}</span>
                </div>
              </div>
            )}
          </Card>
          <Card>
            <div className="p-3 border-b font-semibold text-sm">Shift History</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Counted</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{formatDateTime(s.openedAt)}</TableCell>
                      <TableCell className="text-sm">{s.closedAt ? formatDateTime(s.closedAt) : "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.openingBalance)}</TableCell>
                      <TableCell className="text-right">{s.closingCount !== undefined ? formatCurrency(s.closingCount) : "—"}</TableCell>
                      <TableCell className="text-right">{s.closingBalance !== undefined ? formatCurrency(s.closingBalance) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.status === "OPEN" ? "border-accent text-accent" : "border-muted-foreground text-muted-foreground"}>
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {shifts.length === 0 && (
                     <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No shifts yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* RECEIVABLE */}
        <TabsContent value="receivable" className="space-y-4 mt-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 grid place-items-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Receivable</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totalReceivable)}</p>
            </div>
          </Card>
        </TabsContent>

        {/* PAYABLE */}
        <TabsContent value="payable" className="space-y-4 mt-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 grid place-items-center">
              <TrendingDown className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payable</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPayable)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-3 border-b font-semibold text-sm">Suppliers with Outstanding Balance</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total Purchased</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.filter((s) => s.payableBalance > 0).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.totalPurchased)}</TableCell>
                    <TableCell className="text-right font-semibold text-warning">{formatCurrency(s.payableBalance)}</TableCell>
                  </TableRow>
                ))}
                {suppliers.filter((s) => s.payableBalance > 0).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">All suppliers cleared.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* dialogs */}
      <AccountFormDialog open={accountFormOpen} onOpenChange={setAccountFormOpen} editing={editingAccount} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Cash Drawer</DialogTitle>
            <DialogDescription>Enter the starting cash amount in the drawer.</DialogDescription>
          </DialogHeader>
          <Field label="Opening Balance (৳)">
            <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} autoFocus placeholder="0.00" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleOpen}>
              <Banknote className="h-4 w-4 mr-2" />Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Cash Drawer</DialogTitle>
            <DialogDescription>
              Expected: <span className="font-semibold">{formatCurrency(expectedCash)}</span>. Count actual cash.
            </DialogDescription>
          </DialogHeader>
          <Field label="Counted Cash (৳)">
            <Input type="number" value={closingCount} onChange={(e) => setClosingCount(e.target.value)} autoFocus />
          </Field>
          {closingCount && (
            <p className={`text-sm ${Number(closingCount) - expectedCash < 0 ? "text-destructive" : "text-accent"}`}>
              Over/Short: <span className="font-semibold">{formatCurrency(Number(closingCount) - expectedCash)}</span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleClose}>
              <Lock className="h-4 w-4 mr-2" />Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}
