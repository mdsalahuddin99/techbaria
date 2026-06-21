"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/shared/ui/sheet";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { toast } from "sonner";
import { Search, Eye, FileText, Receipt, ArrowUpDown, Trash2, Pencil, Plus } from "lucide-react";
import { Sale } from "@/shared/lib/types";
import Invoice from "@/components/Invoice";
import { PageHeader, EmptyState } from "@/shared/components";
import { useFilteredSales, useSaleMutations } from "@/features/sales/hooks";
import { useSettings } from "@/features/settings/hooks";

export default function SalesHistory() {
  usePageTitle("Sales");
  const router = useRouter();
  const settings = useSettings();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "total-desc" | "total-asc" | "due-desc" | "due-asc">("newest");
  const [view, setView] = useState<Sale | null>(null);
  const [invoice, setInvoice] = useState<Sale | null>(null);
  const { delete: deleteSale } = useSaleMutations();

  useEffect(() => {
    const handleFocusSearch = () => {
      document.getElementById("sales-search-input")?.focus();
    };
    const handleFilterUnpaid = () => {
      setSort("due-desc");
      toast.info("Sorted by outstanding dues");
    };
    const handleFilterCompleted = () => {
      setSort("newest");
      setMethod("All");
      toast.info("Showing newest completed transactions");
    };

    window.addEventListener("cmd:focus-invoice-search", handleFocusSearch);
    window.addEventListener("cmd:filter-unpaid", handleFilterUnpaid);
    window.addEventListener("cmd:filter-completed", handleFilterCompleted);

    return () => {
      window.removeEventListener("cmd:focus-invoice-search", handleFocusSearch);
      window.removeEventListener("cmd:filter-unpaid", handleFilterUnpaid);
      window.removeEventListener("cmd:filter-completed", handleFilterCompleted);
    };
  }, []);

  const filtered = useFilteredSales({ search, paymentMethod: method });
  const sorted = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => {
      switch (sort) {
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
  }, [filtered, sort]);
  const total = sorted.reduce((s, x) => s + x.total, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales History"
        description="Search, review and reprint past invoices."
        actions={
          <Button onClick={() => router.push("/dashboard/sales/create")} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold mt-1">{sorted.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg Order Value</p>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(sorted.length ? total / sorted.length : 0)}
          </p>
        </Card>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="sales-search-input" placeholder="Search invoice, customer name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All payment methods</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Card">Card</SelectItem>
            <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="sm:w-48">
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
      </Card>

      <Card>
        {/* Mobile: card list */}
        <div className="sm:hidden divide-y">
          {sorted.slice(0, 100).map((s) => {
            const totalItems = s.items.reduce((a, i) => a + i.qty, 0);
            return (
              <div
                key={s.id}
                className="p-4 active:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => setView(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView(s); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(s.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(s.total)}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">{s.paymentMethod}</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{s.customerName}</p>
                    <p className="text-xs text-muted-foreground">{totalItems} item{totalItems !== 1 ? 's' : ''} · {formatCurrency(s.subtotal)} subtotal</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { router.push(`/dashboard/sales/create?saleId=${s.id}`); }} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setInvoice(s); }} title="Invoice">
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / tablet: table */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Method</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.slice(0, 100).map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setView(s)}>
                  <TableCell className="font-medium">{s.invoiceNo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(s.date)}</TableCell>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell className="text-right">{s.items.reduce((a, i) => a + i.qty, 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.subtotal)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(s.total)}</TableCell>
                  <TableCell><Badge variant="secondary">{s.paymentMethod}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setView(s)} title="Quick view">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setInvoice(s)} title="Open invoice">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => router.push(`/dashboard/sales/create?saleId=${s.id}`)} title="Edit sale">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => {
                        if (confirm(`Delete invoice ${s.invoiceNo}? This will restore stock and cannot be undone.`)) {
                          deleteSale(s.id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      icon={Receipt}
                      title="No sales found"
                      description="Try adjusting your search or payment-method filter."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sale Details</SheetTitle>
          </SheetHeader>
          {view && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="bg-secondary p-4 rounded-lg">
                <div className="font-bold text-lg">{view.invoiceNo}</div>
                <div className="text-muted-foreground">{formatDateTime(view.date)}</div>
                <div className="mt-2"><span className="text-muted-foreground">Customer:</span> {view.customerName}</div>
                <div><span className="text-muted-foreground">Cashier:</span> {view.cashier}</div>
              </div>
              <div>
                <p className="font-medium mb-2">Items</p>
                <div className="space-y-1.5">
                  {view.items.map((i) => (
                    <div key={i.productId} className="flex justify-between border-b pb-1.5">
                      <div>
                        <div className="font-medium">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(i.price)} × {i.qty}</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(i.price * i.qty)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 bg-muted/40 p-3 rounded-lg">
                <Row label="Subtotal" value={formatCurrency(view.subtotal)} />
                <Row label="Discount" value={`- ${formatCurrency(view.discount)}`} />
                <div className="flex justify-between font-bold text-base pt-1.5 border-t">
                  <span>Total</span><span className="text-primary">{formatCurrency(view.total)}</span>
                </div>
                <Row label={view.paymentMethod} value={formatCurrency(view.amountPaid)} />
                <Row label="Change" value={formatCurrency(view.change)} />
                {view.editedBy && <Row label="Edited by" value={view.editedBy} />}
                {view.editedAt && <Row label="Edited at" value={formatDateTime(view.editedAt)} />}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Invoice
        sale={invoice}
        settings={settings}
        open={!!invoice}
        onClose={() => setInvoice(null)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
