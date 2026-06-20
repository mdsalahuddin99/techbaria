"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { ClipboardCheck, Plus, Search, Trash2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/shared/components";
import { useAudits, useAuditActions, summarizeAudit } from "@/features/audit/hooks";
import { useWarehouses } from "@/features/warehouses/hooks";
import { listCategories } from "@/shared/api-client/categories";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";

export default function StockAuditPage() {
  const warehouses = useWarehouses();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => listCategories(true) as Promise<{ id: string; name: string }[]>,
  });
  const audits = useAudits();
  const { create, setCount, complete, cancel, remove } = useAuditActions();

  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [createNote, setCreateNote] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => audits.find((a) => a.id === activeId) ?? null, [audits, activeId]);
  const [lineSearch, setLineSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audits.filter((a) => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.auditNumber.toLowerCase().includes(q) ||
        a.warehouseName.toLowerCase().includes(q)
      );
    });
  }, [audits, search, statusFilter]);

  const handleCreate = async () => {
    try {
      const a = await create({
        warehouseId: warehouseId || null,
        categoryFilter: categoryFilter === "All" ? null : categoryFilter,
        note: createNote.trim() || undefined,
      });
      toast.success(`${a.auditNumber} তৈরি হয়েছে`);
      setOpen(false);
      setCreateNote("");
      setActiveId(a.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create audit");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const a = await complete(id);
      const summary = summarizeAudit(a.lines);
      toast.success(
        `Audit সম্পন্ন · ${summary.varianceQty >= 0 ? "+" : ""}${summary.varianceQty} ইউনিট সমন্বয়`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Could not complete audit");
    }
  };

  const visibleLines = useMemo(() => {
    if (!active) return [];
    const q = lineSearch.trim().toLowerCase();
    if (!q) return active.lines;
    return active.lines.filter(
      (l) =>
        l.productName.toLowerCase().includes(q) ||
        l.sku?.toLowerCase().includes(q)
    );
  }, [active, lineSearch]);

  const summary = active ? summarizeAudit(active.lines) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Audit"
        description="Physical count মিলিয়ে variance অটো adjust হয়।"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Audit
          </Button>
        }
      />

      <Card className="p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Audit number, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audit #</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Variance Value</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const s = summarizeAudit(a.lines);
              return (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  onClick={() => setActiveId(a.id)}
                >
                  <TableCell className="font-mono text-xs">{a.auditNumber}</TableCell>
                  <TableCell>{a.warehouseName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.categoryFilter ?? "All Categories"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        a.status === "Completed"
                          ? "default"
                          : a.status === "Cancelled"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.counted}/{a.lines.length}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      s.varianceValue < 0 ? "text-destructive" : s.varianceValue > 0 ? "text-accent" : ""
                    }`}
                  >
                    {formatCurrency(s.varianceValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTime(a.createdAt)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete audit?")) remove(a.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No audits yet"
                    description="শুরু করতে New Audit ক্লিক করুন।"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Stock Audit</DialogTitle>
            <DialogDescription>Branch + category নির্বাচন করুন।</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Warehouse</label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category Scope</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Note (optional)</label>
              <Input value={createNote} onChange={(e) => setCreateNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit count sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
          {active && summary && (
            <>
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  {active.auditNumber}
                  <Badge variant={active.status === "Completed" ? "default" : "outline"}>
                    {active.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {active.warehouseName} · {active.categoryFilter ?? "All Categories"}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border-b text-center">
                <Mini label="Counted" value={`${summary.counted}/${active.lines.length}`} />
                <Mini label="Pending" value={String(summary.pending)} />
                <Mini
                  label="Var Qty"
                  value={`${summary.varianceQty >= 0 ? "+" : ""}${summary.varianceQty}`}
                  tone={summary.varianceQty < 0 ? "destructive" : summary.varianceQty > 0 ? "accent" : undefined}
                />
                <Mini
                  label="Var Value"
                  value={formatCurrency(summary.varianceValue)}
                  tone={summary.varianceValue < 0 ? "destructive" : summary.varianceValue > 0 ? "accent" : undefined}
                />
              </div>

              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search product or scan SKU..."
                    value={lineSearch}
                    onChange={(e) => setLineSearch(e.target.value)}
                    className="pl-9"
                    disabled={active.status !== "Draft"}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {visibleLines.map((l) => {
                  const diff = l.countedQty == null ? null : l.countedQty - l.systemQty;
                  return (
                    <div
                      key={l.productId}
                      className="px-3 py-2 border-b flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{l.productName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {l.sku ? `SKU ${l.sku} · ` : ""}System {l.systemQty}
                        </div>
                      </div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="w-20 text-right"
                        value={l.countedQty == null ? "" : l.countedQty}
                        placeholder="—"
                        disabled={active.status !== "Draft"}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCount(active.id, l.productId, v === "" ? null : Math.max(0, Number(v)));
                        }}
                      />
                      <div
                        className={`w-16 text-right text-xs font-medium ${
                          diff == null
                            ? "text-muted-foreground"
                            : diff < 0
                            ? "text-destructive"
                            : diff > 0
                            ? "text-accent"
                            : "text-muted-foreground"
                        }`}
                      >
                        {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${diff}`}
                      </div>
                    </div>
                  );
                })}
                {visibleLines.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground p-6">No matching products.</p>
                )}
              </div>

              {active.status === "Draft" && (
                <div className="p-3 border-t flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Cancel this audit?")) {
                        cancel(active.id);
                        setActiveId(null);
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleComplete(active.id)}
                    disabled={summary.counted === 0}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />Complete & Post Variances
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "destructive" | "accent" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
