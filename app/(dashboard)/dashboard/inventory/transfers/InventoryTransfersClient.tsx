"use client";

import { useMemo, useState } from "react";
import { useProductsQuery } from "@/features/products/hooks";
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
import { formatDateTime } from "@/shared/lib/format";
import { ArrowLeftRight, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/shared/components";
import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { useWarehouses } from "@/features/warehouses/hooks";
import {
  useFilteredTransfers,
  useCreateTransfer,
  useDispatchTransfer,
  useReceiveTransfer,
  useCancelTransfer,
  useDeleteTransfer,
  useTransfers,
} from "@/features/transfers/hooks";
import type { TransferStatus } from "@/features/transfers/types";

const STATUSES: TransferStatus[] = ["PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"];

interface DraftLine {
  productId: string;
  name: string;
  qty: number;
}

export function InventoryTransfersClient() {
  const warehouses = useWarehouses();
  const products = ((useProductsQuery().data as any)?.items ?? []) as any[];
  const allTransfers = useTransfers();
  const createMutation = useCreateTransfer();
  const dispatchMutation = useDispatchTransfer();
  const receiveMutation = useReceiveTransfer();
  const cancelMutation = useCancelTransfer();
  const removeMutation = useDeleteTransfer();

  const create = createMutation.mutateAsync;
  const dispatch = dispatchMutation.mutateAsync;
  const receive = receiveMutation.mutateAsync;
  const cancel = cancelMutation.mutateAsync;
  const remove = removeMutation.mutateAsync;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [activeProductId, setActiveProductId] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useMemo(
    () => allTransfers.find((t) => t.id === detailId) ?? null,
    [allTransfers, detailId]
  );

  const filtered = useFilteredTransfers({ search, status: statusFilter });

  const reset = () => {
    setFromId("");
    setToId("");
    setNote("");
    setLines([]);
    setActiveProductId("");
    setQtyInput("1");
  };

  const addLine = () => {
    const p = products.find((x) => x.id === activeProductId);
    if (!p) return toast.error("Product সিলেক্ট করুন");
    if (lines.some((l) => l.productId === p.id)) return toast.error("Already added");
    const qty = Math.max(1, Number(qtyInput) || 1);
    setLines((prev) => [...prev, { productId: p.id, name: p.name, qty }]);
    setActiveProductId("");
    setQtyInput("1");
  };

  const removeLine = (productId: string) =>
    setLines((prev) => prev.filter((l) => l.productId !== productId));

  const submit = async () => {
    if (!fromId || !toId) return toast.error("From ও To warehouse দিন");
    if (fromId === toId) return toast.error("Source আর destination একই হতে পারবে না");
    if (lines.length === 0) return toast.error("কমপক্ষে একটি item");
    try {
      const t = await create({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        items: lines.map((l) => {
          const prod = products.find((p) => p.id === l.productId);
          return { productId: l.productId, qty: l.qty, name: prod?.name ?? "" };
        }),
        note: note || undefined,
      });
      toast.success(`Transfer #${t.id.slice(-6).toUpperCase()} তৈরি হয়েছে`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const statusBadge = (s: TransferStatus) => {
    const cls =
      s === "COMPLETED" ? "border-accent text-accent" :
      s === "IN_TRANSIT" ? "border-primary text-primary" :
      s === "CANCELLED" ? "border-destructive text-destructive" :
      "border-muted-foreground text-muted-foreground";
    return <Badge variant="outline" className={cls}>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Transfers"
        description="এক warehouse থেকে অন্য warehouse-এ stock পাঠানোর audit log।"
      />
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by # or warehouse…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { reset(); setOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={warehouses.length < 2}
          >
            <Plus className="h-4 w-4 mr-2" />New Transfer
          </Button>
        </div>
        {warehouses.length < 2 && (
          <p className="text-xs text-muted-foreground mt-2">
            Transfer তৈরি করতে কমপক্ষে ২টি warehouse দরকার।
          </p>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const units = t.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetailId(t.id)}>
                    <TableCell className="font-medium">{t.transferNumber || `TRF-${t.id.slice(-6).toUpperCase()}`}</TableCell>
                    <TableCell>{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell>{t.fromWarehouseName}</TableCell>
                    <TableCell>{t.toWarehouseName}</TableCell>
                    <TableCell className="text-right">{t.items.length}</TableCell>
                    <TableCell className="text-right">{units}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      icon={ArrowLeftRight}
                      title="No transfers yet"
                      description='Click "New Transfer" to create one.'
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New transfer dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>
              From → To warehouse এবং কোন product কত qty পাঠাবেন সেট করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">From warehouse</label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">To warehouse</label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter((w) => w.id !== fromId).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="p-3 bg-secondary/40 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Add product line</div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Product</label>
                  <AutoSuggest
                    value={activeProductId}
                    onValueChange={setActiveProductId}
                    options={products.filter((p) => p.active).map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    placeholder="Search product…"
                    emptyMessage="No product found"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Qty</label>
                  <Input type="number" min={1} value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} />
                </div>
                <Button onClick={addLine} variant="secondary">Add</Button>
              </div>
            </Card>

            {lines.length > 0 && (
              <div className="border rounded-md divide-y">
                {lines.map((l) => (
                  <div key={l.productId} className="flex items-center justify-between p-2 text-sm">
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">Qty: {l.qty}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeLine(l.productId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Note (optional)</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Friday van" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Create transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.transferNumber}</SheetTitle>
            <SheetDescription>
              {detail?.fromWarehouseName} → {detail?.toWarehouseName}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center gap-2">
                {statusBadge(detail.status)}
                <span className="text-muted-foreground">{formatDateTime(detail.createdAt)}</span>
              </div>
              {detail.note && (
                <div className="text-muted-foreground italic">"{detail.note}"</div>
              )}
              <div className="border rounded-md divide-y">
                {detail.items.map((i) => (
                  <div key={i.productId} className="flex justify-between p-2">
                    <span>{i.name}</span>
                    <span className="font-medium">{i.qty}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {detail.status === "PENDING" && (
                  <Button
                    onClick={async () => { await dispatch(detail.id); toast.success("Dispatched"); }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Mark dispatched
                  </Button>
                )}
                {(detail.status === "PENDING" || detail.status === "IN_TRANSIT") && (
                  <>
                    <Button
                      onClick={async () => { await receive(detail.id); toast.success("Received"); }}
                      variant="secondary"
                    >
                      Mark received
                    </Button>
                    <Button
                      onClick={async () => { await cancel(detail.id); toast.message("Cancelled"); }}
                      variant="outline"
                      className="text-destructive"
                    >
                      Cancel transfer
                    </Button>
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {detail.dispatchedAt && <div>Dispatched: {formatDateTime(detail.dispatchedAt)}</div>}
                {detail.receivedAt && <div>Received: {formatDateTime(detail.receivedAt)}</div>}
                {detail.cancelledAt && <div>Cancelled: {formatDateTime(detail.cancelledAt)}</div>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
