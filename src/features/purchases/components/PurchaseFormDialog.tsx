"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api-client/fetch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { LoadingButton } from "@/shared/ui/loading-button";
import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { formatCurrency, formatDate, productDisplayName } from "@/shared/lib/format";
import { Plus, X, ShoppingCart, ScanLine, Package, Camera, Wallet, Building2, Warehouse as WarehouseIcon, User, Phone, Mail, FileText } from "lucide-react";
import CameraScanner from "@/components/CameraScanner";
import { SupplierFormDialog } from "@/features/suppliers/SupplierFormDialog";
import { ProductFormDialog } from "@/features/products/ProductFormDialog";
import { usePurchaseForm, lineCost, lineSale } from "../hooks/usePurchaseForm";
import { ACCOUNT_TYPE_LABEL } from "@/features/accounts/types";

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
  onSuccess: (id?: string) => void;
  products: any[];
  suppliers: any[];
  accounts: any[];
  accountsTree: any[];
  balances: Record<string, number>;
  defaultAccountId: string;
  branches: any[];
  warehouses: any[];
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  selectedWarehouseId: string | null;
  setSelectedWarehouseId: (id: string | null) => void;
  initialSupplierId?: string;
  initialProductId?: string;
  initialQty?: number;
}

function SupplierSidebar({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["supplier-profile", supplierId],
    queryFn: () => apiFetch<any>(`/api/suppliers/${supplierId}/profile`),
    enabled: !!supplierId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-slate-200 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { supplier, recentPurchases = [], recentPayments = [] } = data;

  return (
    <div className="space-y-5 text-sm">
      {/* Basic Info */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-slate-400" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-slate-800 truncate">
            {supplier.name}
          </h4>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {supplier.contactPerson ? `Contact: ${supplier.contactPerson}` : "Supplier"}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {supplier.phone && (
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{supplier.phone}</span>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.address && (
          <div className="flex items-start gap-2 text-slate-600">
            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="break-words leading-relaxed">{supplier.address}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/60 pt-3 space-y-1.5">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Account Status
        </h5>
        <div className="flex justify-between items-end">
          <span className="text-xs font-medium text-slate-500">Payable Balance</span>
          <span className="text-xs font-bold text-red-600 tabular-nums">
            {formatCurrency(supplier.payableBalance)}
          </span>
        </div>
      </div>

      {supplier.notes && (
        <div className="border-t border-slate-200/60 pt-3 space-y-1">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Notes
          </h5>
          <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
            {supplier.notes}
          </p>
        </div>
      )}

      {/* Recent Purchases */}
      <div className="border-t border-slate-200/60 pt-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Recent Purchases
        </h5>
        {recentPurchases.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No purchase history</p>
        ) : (
          <ul className="space-y-1.5 max-h-36 overflow-y-auto">
            {recentPurchases.map((p: any) => (
              <li key={p.id} className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded p-1.5 text-[11px]">
                <div className="min-w-0 mr-2">
                  <p className="font-semibold text-slate-700 truncate">{p.invoiceNo || `PO-${p.id.slice(-4)}`}</p>
                  <p className="text-[9px] text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-700">{formatCurrency(p.total)}</p>
                  {p.due > 0 && (
                    <p className="text-[9px] text-red-500 font-medium">Due: {formatCurrency(p.due)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Payments */}
      <div className="border-t border-slate-200/60 pt-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Recent Payments
        </h5>
        {recentPayments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No payments recorded</p>
        ) : (
          <ul className="space-y-1.5 max-h-36 overflow-y-auto">
            {recentPayments.map((pm: any) => (
              <li key={pm.id} className="bg-slate-50 border border-slate-150 rounded p-1.5 text-[11px] space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-600">{formatCurrency(pm.amount)}</span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(pm.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </div>
                {pm.accountName && (
                  <p className="text-[9px] text-slate-500">Account: {pm.accountName}</p>
                )}
                {pm.notes && (
                  <p className="text-[9px] text-slate-400 italic truncate">{pm.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PurchaseFormDialog({
  open, onOpenChange, editId, onSuccess,
  products, suppliers, accounts, accountsTree, balances, defaultAccountId,
  branches, warehouses, selectedBranchId, setSelectedBranchId, selectedWarehouseId, setSelectedWarehouseId,
  initialSupplierId, initialProductId, initialQty
}: PurchaseFormDialogProps) {
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const form = usePurchaseForm({
    editId,
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
    products, accounts, defaultAccountId, selectedBranchId, selectedWarehouseId
  });

  // Auto-initialize from props (URL params)
  useEffect(() => {
    if (open && initialProductId && !editId && form.lines.length === 0) {
      const product = products.find((p) => p.id === initialProductId);
      if (product) {
        form.setSupplierId(initialSupplierId || product.supplierId || "");
        form.setLines([
          {
            productId: product.id,
            name: productDisplayName(product),
            baseCost: product.costPrice || 0,
            extraCost: 0,
            saleMode: "amount",
            saleInput: product.price ? String(Math.max(0, product.price - (product.costPrice || 0))) : "",
            warrantyStartDate: undefined,
            warrantyMonths: undefined,
            expectedDate: undefined,
            serials: [],
            trackSerials: product.trackSerials !== false,
            manualQty: initialQty || 1,
          },
        ]);
        form.setActiveProductId(product.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialProductId, editId]);

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => {
        if (!val && !form.saving) {
          form.reset();
        }
        onOpenChange(val);
      }}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle>
            <DialogDescription>
              একই Supplier থেকে একাধিক প্রোডাক্ট একসাথে পারচেজ করুন। প্রতিটি প্রোডাক্টের জন্য আলাদা কস্ট, সিরিয়াল এবং ওয়ারেন্টি সেট করতে পারবেন।
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row gap-6 items-start mt-4">
            {/* Supplier Profile Panel */}
            {form.supplierId && (
              <div className="w-full lg:w-72 shrink-0 border border-slate-250 bg-slate-50/40 rounded-lg p-4 max-h-[72vh] overflow-y-auto sticky top-0">
                <SupplierSidebar supplierId={form.supplierId} />
              </div>
            )}

            {/* Main Form Fields */}
            <div className="flex-1 w-full space-y-4 min-w-0">
            {form.editLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-primary border-t-transparent rounded-full" />
                Loading purchase data…
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Supplier</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <AutoSuggest
                      value={form.supplierId}
                      onValueChange={form.setSupplierId}
                      options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                      placeholder="Search supplier…"
                      emptyMessage="No supplier found"
                      allowClear
                    />
                  </div>
                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={() => setAddSupplierOpen(true)} title="Add new supplier"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Card className="p-3 bg-secondary/40" data-product-picker>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground">Add product</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <AutoSuggest
                        value={form.activeProductId}
                        onValueChange={form.setActiveProductId}
                        options={products.filter((p) => p.active).map((p) => ({
                          value: p.id,
                          label: productDisplayName(p),
                          disabled: form.lines.some((l) => l.productId === p.id),
                          description: p.subcategory || undefined,
                          badge: `Stock: ${p.stock ?? 0}`,
                        }))}
                        placeholder="Search product…"
                        emptyMessage="No product found"
                        allowClear
                        autoFocus
                      />
                    </div>
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 self-end" onClick={() => setAddProductOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={form.startLine}
                  disabled={!form.activeProductId || form.lines.some((l) => l.productId === form.activeProductId)}
                >
                  <Plus className="h-4 w-4 mr-1" />{form.lines.length === 0 ? "Add" : "Add More"}
                </Button>
              </div>
            </Card>

            {form.lines.length > 0 && (
              <div className="space-y-2">
                {form.lines.map((l) => {
                  const product = products.find((p) => p.id === l.productId);
                  const finalSale = lineSale(l, product?.price || 0);
                  const totalCost = lineCost(l);
                  const isCollapsed = form.collapsedSet.has(l.productId);
                  const units = form.lineUnits(l);
                  const isScanActive = l.productId === form.activeProductId;
                  return (
                    <Card key={l.productId} className={isCollapsed ? "p-2.5" : "p-3 space-y-3 border-primary"}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate">{l.name}</span>
                          <Badge variant="secondary" className="shrink-0 text-[11px]">{units} unit{units !== 1 ? "s" : ""}</Badge>
                          <Badge variant="outline" className="shrink-0 text-[11px]">
                            {formatCurrency(totalCost * units)}
                          </Badge>
                          {l.trackSerials && l.serials.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{l.serials.length} serial</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                            form.setCollapsedSet((prev) => {
                              const next = new Set(prev);
                              if (next.has(l.productId)) next.delete(l.productId); else next.add(l.productId);
                              return next;
                            });
                          }}>
                            {isCollapsed ? "Edit" : "Collapse"}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => form.removeLine(l.productId)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {!isCollapsed && (<>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Cost ৳ *</label>
                          <Input type="number" value={l.baseCost === 0 ? "" : l.baseCost} onChange={(e) => form.updateLine(l.productId, { baseCost: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Extra Cost ৳ *</label>
                          <Input type="number" placeholder="0" value={l.extraCost === 0 ? "" : l.extraCost} onChange={(e) => form.updateLine(l.productId, { extraCost: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-muted-foreground">{l.saleMode === "percent" ? "Margin %" : "Sale ৳"}</label>
                            <div className="flex rounded-md border overflow-hidden">
                              <button type="button" onClick={() => form.updateLine(l.productId, { saleMode: "percent", saleInput: "" })} className={`px-2 h-6 text-[11px] font-medium ${l.saleMode === "percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>%</button>
                              <button type="button" onClick={() => form.updateLine(l.productId, { saleMode: "amount", saleInput: "" })} className={`px-2 h-6 text-[11px] font-medium ${l.saleMode === "amount" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>৳</button>
                            </div>
                          </div>
                          <Input
                            type="number"
                            min={0}
                            max={l.saleMode === "percent" ? 100 : undefined}
                            value={l.saleInput}
                            placeholder={l.saleMode === "percent" ? "0-100" : "margin amount"}
                            onChange={(e) => {
                              if (l.saleMode === "percent") {
                                const v = e.target.value === "" ? "" : String(Math.min(100, Math.max(0, Number(e.target.value) || 0)));
                                form.updateLine(l.productId, { saleInput: v });
                              } else {
                                form.updateLine(l.productId, { saleInput: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Final Sale ৳</label>
                          <div className="flex items-center gap-2">
                            <Input type="text" readOnly tabIndex={-1} value={finalSale > 0 ? formatCurrency(finalSale) : ""} placeholder="—" className="bg-muted/50 font-medium text-primary" />
                            {totalCost > 0 && finalSale > totalCost && (
                              <Badge variant="outline" className="text-success bg-success/10 shrink-0">
                                {(((finalSale - totalCost) / totalCost) * 100).toFixed(1)}% margin
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Expected Date *</label>
                          <Input type="date" value={l.expectedDate ?? ""} onChange={(e) => form.updateLine(l.productId, { expectedDate: e.target.value || undefined })} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Warranty (months)</label>
                          <Input type="number" min={0} placeholder="No Warranty" value={l.warrantyMonths ?? ""} onChange={(e) => form.updateLine(l.productId, { warrantyMonths: e.target.value ? Number(e.target.value) : undefined })} />
                          {l.expectedDate && l.warrantyMonths && l.warrantyMonths > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              মেয়াদ শেষ: {formatDate(new Date(new Date(l.expectedDate).setMonth(new Date(l.expectedDate).getMonth() + l.warrantyMonths)).toISOString().slice(0, 10))}
                            </p>
                          )} 
                        </div>
                      </div>

                      {!l.trackSerials ? (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Quantity</label>
                          <Input type="number" min={1} className="w-28" value={l.manualQty} onChange={(e) => form.setManualQty(l.productId, Number(e.target.value) || 1)} />
                          <span className="text-[11px] text-muted-foreground">(এই product serial-tracked না)</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">Scan serials / barcodes</label>
                            {!isScanActive && (
                              <Button size="sm" variant="ghost" onClick={() => form.setActiveProductId(l.productId)}>
                                <ScanLine className="h-3.5 w-3.5 mr-1" />Activate scan
                              </Button>
                            )}
                          </div>
                          {isScanActive && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  ref={form.scanRef}
                                  autoFocus
                                  placeholder="Scan barcode / type serial then Enter…"
                                  value={form.scanInput}
                                  onChange={(e) => form.setScanInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      form.addSerial(form.scanInput);
                                    }
                                  }}
                                  className="pl-9 font-mono"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => form.setCameraOpen(true)} title="Camera scan">
                                  <Camera className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" onClick={() => form.addSerial(form.scanInput)}>Add</Button>
                              </div>
                            </div>
                          )}
                          {l.serials.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {l.serials.map((s) => (
                                <Badge key={s} variant="outline" className="font-mono gap-1 pr-1">
                                  {s}
                                  <button type="button" onClick={() => form.removeSerial(l.productId, s)} className="hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      </>)}
                    </Card>
                  );
                })}
              </div>
            )}

            {form.lines.length > 0 && (
              <div className="flex justify-center">
                <Button variant="outline" className="gap-2 border-dashed" onClick={() => {
                  form.setCollapsedSet(new Set(form.lines.map((l) => l.productId)));
                  const picker = document.querySelector('[data-product-picker]');
                  picker?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}>
                  <Plus className="h-4 w-4" /> Add Another Product
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Transaction Reference</label>
                <Input value={form.reference} onChange={(e) => form.setReference(e.target.value)} placeholder="e.g. TXN-12345 / Cheque #" />
              </div>
            </div>

            <Card className="p-3 space-y-3 bg-secondary/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Payment Tenders</span>
                  <Badge variant="outline" className="text-xs">
                    জমা {formatCurrency(form.totalPaid)} / {formatCurrency(form.subtotal)}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  const remaining = Math.max(0, form.subtotal - form.totalPaid);
                  form.addTender(remaining > 0 ? remaining : undefined);
                }} disabled={!defaultAccountId || accounts.length === 0}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add tender
                </Button>
              </div>

              {accounts.length === 0 ? (
                <div className="text-xs text-muted-foreground border rounded-md p-2">Accounts page থেকে আগে account add করুন</div>
              ) : form.tenders.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Product যোগ করলে এখানে auto একটি payment বসে যাবে। একাধিক account থেকে split দিতে "Add tender" চাপুন।</div>
              ) : (
                <div className="space-y-2">
                  {form.tenders.map((t, idx) => (
                    <div key={t.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-start">
                      <Select value={t.accountId} onValueChange={(v) => form.updateTender(t.id, { accountId: v })}>
                        <SelectTrigger><SelectValue placeholder="Account select করুন" /></SelectTrigger>
                        <SelectContent>
                          {accountsTree.map((n) => (
                            <SelectItem key={n.account.id} value={n.account.id}>
                              {n.depth > 0 ? "\u00A0\u00A0↳ " : ""}{n.account.name} · {ACCOUNT_TYPE_LABEL[n.account.type]} · {formatCurrency(balances[n.account.id] ?? 0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min={0} placeholder="৳" value={t.amount}
                        onChange={(e) => form.updateTender(t.id, { amount: e.target.value, manuallyEdited: true })}
                        onFocus={(e) => {
                          const current = Number(t.amount) || 0;
                          if (current > 0) return;
                          const sumOthers = form.tenders.reduce((s, x) => s + (x.id === t.id ? 0 : Number(x.amount) || 0), 0);
                          const remaining = Math.max(0, form.subtotal - sumOthers);
                          if (remaining > 0) {
                            form.updateTender(t.id, { amount: String(remaining), manuallyEdited: true });
                            requestAnimationFrame(() => (e.target as HTMLInputElement).select());
                          }
                        }}
                      />
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => form.removeTender(t.id)} title={`Remove tender ${idx + 1}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {(() => {
              const totalProducts = form.lines.length;
              const totalUnits = form.lines.reduce((s, l) => s + form.lineUnits(l), 0);
              const paid = form.totalPaid;
              const due = Math.max(0, form.subtotal - paid);
              const Cell = ({ label, value, accent }: { label: string; value: string; accent?: "primary" | "success" | "warning" }) => (
                <div className="rounded-md bg-background/60 border border-border/60 p-2.5">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className={`text-base font-bold ${accent === "primary" ? "text-primary" : accent === "success" ? "text-accent" : accent === "warning" ? "text-warning" : ""}`}>
                    {value}
                  </div>
                </div>
              );
              return (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Cell label="মোট প্রডাক্ট" value={String(totalProducts)} />
                    <Cell label="মোট ইউনিট" value={String(totalUnits)} />
                    <Cell label="মোট কস্ট" value={formatCurrency(form.subtotal)} accent="primary" />
                    <Cell label="মোট বিক্রয়" value={formatCurrency(form.saleTotal)} accent="success" />
                    <Cell label="সম্ভাব্য লাভ" value={formatCurrency(Math.max(0, form.saleTotal - form.subtotal))} accent="success" />
                    <Cell label="জমা" value={formatCurrency(paid)} accent="success" />
                    <Cell label="বাকি" value={formatCurrency(due)} accent={due > 0 ? "warning" : undefined} />
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={async () => {
              const poId = await form.submit();
              if (poId) {
                // Success is already handled in hook, but we can pass the ID up
              }
            }} loading={form.saving}>
              <ShoppingCart className="h-4 w-4 mr-2" />Save Purchase
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraScanner
        open={form.cameraOpen}
        onClose={() => form.setCameraOpen(false)}
        onDetected={(code) => form.addSerial(code)}
        scanCount={form.activeLine?.serials.length ?? 0}
        addedCount={form.activeLine?.serials.length ?? 0}
      />

      <SupplierFormDialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen} editing={null} />
      <ProductFormDialog open={addProductOpen} onOpenChange={setAddProductOpen} editing={null} />
    </>
  );
}
