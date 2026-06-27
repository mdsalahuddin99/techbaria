"use client";

import { useMemo, useState } from "react";
import { useSuppliers } from "@/features/suppliers/hooks";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { Plus, Sparkles, Trash2, X, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import { toast } from "sonner";
import { RestockOrder } from "@/shared/lib/types";
import { PageHeader } from "@/shared/components";
import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { useRestocks, useRestockActions } from "@/features/purchases/hooks";
import { useProductsQuery } from "@/features/products/hooks";

export function RestockClient() {
  const products = ((useProductsQuery().data as any)?.items ?? []) as any[];
  const { data: suppliers } = useSuppliers();
  const restocks = useRestocks();
  const {
    createDraft: createRestockDraft,
    updateItem: updateRestockItem,
    removeItem: removeRestockItem,
    confirm: confirmRestock,
    delete: deleteRestock,
  } = useRestockActions();

  const [active, setActive] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [supplierForConfirm, setSupplierForConfirm] = useState<string>("none");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.active && p.stock <= p.minStock).length,
    [products]
  );

  const generate = async () => {
    try {
      const ro = await createRestockDraft();
      toast.success(`Draft ${ro.roNumber} created with ${ro.items.length} items`);
      setActive(ro.id);
    } catch {
      toast.info("No products are below their minimum stock level");
    }
  };

  const activeOrder: RestockOrder | undefined =
    restocks.find((r) => r.id === active) ?? restocks.find((r) => r.status === "Draft");

  const totalCost = (ro: RestockOrder) =>
    ro.items.reduce((s, i) => s + i.suggestedQty * i.costPrice, 0);

  const handleConfirm = async () => {
    setConfirming(true);
    if (!confirmId) { setConfirming(false); return; }
    try {
      await confirmRestock(confirmId, supplierForConfirm === "none" ? null : supplierForConfirm);
      toast.success("Restock confirmed and inventory updated");
      setConfirmId(null);
      setSupplierForConfirm("none");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader
          title="Restock Orders"
          description="Auto-generate restock drafts from low-stock products."
        />
      </div>
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 grid place-items-center">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Products below min stock</p>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </div>
        </div>
        <Button
          onClick={generate}
          className="sm:ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Restock Draft
        </Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 print:block">
        {/* Order list */}
        <Card className="print:hidden">
          <div className="p-3 border-b">
            <p className="text-sm font-semibold">Restock Orders</p>
          </div>
          <div className="divide-y">
            {restocks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10 px-4">
                No restock orders yet. Generate a draft to get started.
              </p>
            )}
            {restocks.map((r) => (
              <button
                key={r.id}
                onClick={() => setActive(r.id)}
                className={`w-full text-left p-3 hover:bg-secondary/60 transition-colors ${active === r.id ? "bg-secondary" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.roNumber}</span>
                  <Badge
                    variant="outline"
                    className={r.status === "Confirmed" ? "border-accent text-accent" : "border-primary text-primary"}
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.items.length} items · {formatDate(r.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* Active order detail */}
        <Card>
          {activeOrder ? (
            <>
              <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{activeOrder.roNumber}</h3>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDateTime(activeOrder.createdAt)}
                    {activeOrder.confirmedAt && ` · Confirmed ${formatDateTime(activeOrder.confirmedAt)}`}
                  </p>
                </div>
                <div className="flex gap-2 print:hidden">
                  {activeOrder.status === "Draft" && (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => { setConfirmId(activeOrder.id); setSupplierForConfirm("none"); }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />Confirm & Update Inventory
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="text-destructive" onClick={() => setDeleteId(activeOrder.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Order Qty</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOrder.items.map((i) => (
                      <TableRow key={i.productId}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="border-warning text-warning">{i.currentStock}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{i.minStock}</TableCell>
                        <TableCell className="text-right">
                          {activeOrder.status === "Draft" ? (
                            <Input
                              type="number"
                              value={i.suggestedQty}
                              onChange={(e) =>
                                updateRestockItem(activeOrder.id, i.productId, Number(e.target.value))
                              }
                              className="w-24 text-right ml-auto"
                            />
                          ) : (
                            <span className="font-medium">{i.suggestedQty}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(i.costPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(i.suggestedQty * i.costPrice)}
                        </TableCell>
                        <TableCell>
                          {activeOrder.status === "Draft" && (
                            <Button
                              size="icon" variant="ghost" className="text-destructive"
                              onClick={() => removeRestockItem(activeOrder.id, i.productId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {activeOrder.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          All items removed.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-4 border-t flex justify-between items-center bg-primary/5">
                <span className="font-medium">Estimated Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalCost(activeOrder))}</span>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <Plus className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Select a restock order or generate a new draft.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Restock</DialogTitle>
            <DialogDescription>
              Inventory will increase by the order quantities. Optionally assign to a supplier to track payable.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Supplier (optional)</label>
            <AutoSuggest
              value={supplierForConfirm === "none" ? "" : supplierForConfirm}
              onValueChange={(v) => setSupplierForConfirm(v || "none")}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Search supplier…"
              emptyMessage="No supplier found"
              allowClear
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleConfirm} loading={confirming}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Confirm
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this restock order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteRestock(deleteId);
                  if (active === deleteId) setActive(null);
                  toast.success("Restock order deleted");
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
