"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api-client/fetch";
import { suppliersService } from "@/services";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { toast } from "sonner";
import { LoadingButton } from "@/shared/ui/loading-button";
import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { formatCurrency, formatDate, productDisplayName } from "@/shared/lib/format";
import { Plus, X, ShoppingCart, ScanLine, Package, Camera, Wallet, Building2, Warehouse as WarehouseIcon, User, Phone, Mail, FileText, QrCode } from "lucide-react";
import dynamic from "next/dynamic";
const CameraScanner = dynamic(() => import("@/components/CameraScanner"), { ssr: false });
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
  warehouses: any[];
  selectedWarehouseId: string | null;
  setSelectedWarehouseId: (id: string | null) => void;
  initialSupplierId?: string;
  initialProductId?: string;
  initialQty?: number;
}

function SupplierSidebar({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["supplier-profile", supplierId],
    queryFn: () => suppliersService.getProfile(supplierId),
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

function ScanField({
  productId,
  onAdd,
  onCamera,
  autoFocus
}: {
  productId: string;
  onAdd: (productId: string, serial: string) => void;
  onCamera: () => void;
  autoFocus?: boolean;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          autoFocus={autoFocus}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(productId, val);
              setVal("");
            }
          }}
          placeholder="Scan barcode / type serial…"
          className="pl-10 font-mono"
        />
      </div>
      <Button type="button" variant="outline" size="icon" onClick={onCamera} title="Camera scan" className="shrink-0 w-10">
        <QrCode className="h-5 w-5" />
      </Button>
      <Button type="button" variant="secondary" onClick={() => { onAdd(productId, val); setVal(""); }} className="shrink-0">Add</Button>
    </div>
  );
}

export function PurchaseFormDialog({
  open, onOpenChange, editId, onSuccess,
  products, suppliers, accounts, accountsTree, balances, defaultAccountId,
  warehouses, selectedWarehouseId, setSelectedWarehouseId,
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
    products,
    accounts,
    defaultAccountId,
    selectedWarehouseId,
  });

  const currentSupplier = suppliers.find(s => s.id === form.supplierId);
  const supplierAdvance = currentSupplier?.advanceBalance || 0;

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
            baseCost: 0,
            extraCost: 0,
            saleMode: "amount",
            saleInput: "",
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
        <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl max-h-[92vh] flex flex-col p-0" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>{editId ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle>
            <DialogDescription>
              একই Supplier থেকে একাধিক প্রোডাক্ট একসাথে পারচেজ করুন। প্রতিটি প্রোডাক্টের জন্য আলাদা কস্ট, সিরিয়াল এবং ওয়ারেন্টি সেট করতে পারবেন।
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 min-h-0">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
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
                        key={form.lines.length}
                        value={form.activeProductId}
                        onValueChange={form.setActiveProductId}
                        options={products
                          .filter((p) => p.active && !form.lines.some((l) => l.productId === p.id))
                          .map((p) => ({
                            value: p.id,
                            label: productDisplayName(p),
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
                          <Input type="text" readOnly tabIndex={-1} value={finalSale > 0 ? formatCurrency(finalSale) : ""} placeholder="—" className="bg-muted/50 font-medium text-primary w-full" />
                          {totalCost > 0 && finalSale > totalCost && (
                            <div className="mt-1">
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                                {(((finalSale - totalCost) / totalCost) * 100).toFixed(1)}% margin
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[160px_140px_1fr] gap-4 items-start">
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

                        <div className="sm:col-span-2 lg:col-span-1">
                          {!l.trackSerials ? (
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Quantity</label>
                              <div className="flex items-center gap-2">
                                <Input type="number" min={1} className="w-28" value={l.manualQty} onChange={(e) => form.setManualQty(l.productId, Number(e.target.value) || 1)} />
                                <span className="text-[11px] text-muted-foreground">(এই product serial-tracked না)</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between h-[18px]">
                                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                  <ScanLine className="h-4 w-4 text-primary" /> Scan serials / barcodes
                                </label>
                              </div>
                              <ScanField 
                                productId={l.productId} 
                                onAdd={form.addSerial} 
                                onCamera={() => {
                                  form.setActiveScanId(l.productId);
                                  form.setCameraOpen(true);
                                }}
                                autoFocus={form.activeScanId === l.productId}
                              />
                            </div>
                          )}
                        </div>

                        {l.trackSerials && l.serials.length > 0 && (
                          <div className="col-span-1 lg:col-span-4 mt-1">
                            <div className="flex flex-wrap gap-1.5">
                              {l.serials.map((s) => (
                                <Badge key={s} variant="outline" className="font-mono gap-1 pr-1 bg-background">
                                  {s}
                                  <button type="button" onClick={() => form.removeSerial(l.productId, s)} className="hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      </>)}
                    </Card>
                  );
                })}
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
                          {supplierAdvance > 0 && (
                            <SelectItem value="WALLET" className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20">
                              Supplier Wallet Advance · {formatCurrency(supplierAdvance)}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min={0} placeholder="৳" value={t.amount}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (t.accountId === "WALLET" && Number(val) > supplierAdvance) {
                            val = String(supplierAdvance);
                            toast.error(`Advance balance cannot exceed ${formatCurrency(supplierAdvance)}`);
                          }
                          form.updateTender(t.id, { amount: val, manuallyEdited: true });
                        }}
                        onFocus={(e) => {
                          const current = Number(t.amount) || 0;
                          if (current > 0) return;
                          const sumOthers = form.tenders.reduce((s, x) => s + (x.id === t.id ? 0 : Number(x.amount) || 0), 0);
                          let remaining = Math.max(0, form.subtotal - sumOthers);
                          if (t.accountId === "WALLET" && remaining > supplierAdvance) {
                            remaining = supplierAdvance;
                          }
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

            </div>
          </div>
        </div>
          <DialogFooter className="p-6 py-4 border-t border-border bg-secondary/15 flex flex-col gap-4 shrink-0 w-full">
            {(() => {
              const totalProducts = form.lines.length;
              const totalUnits = form.lines.reduce((s, l) => s + form.lineUnits(l), 0);
              const paid = form.totalPaid;
              const due = Math.max(0, form.subtotal - paid);
              return (
                <div className="w-full border border-border/80 bg-card rounded-[4px] p-3 text-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-semibold">প্রডাক্ট ও ইউনিট:</span>
                      <span className="font-bold text-slate-700 bg-secondary/30 px-2 py-0.5 rounded border border-border/60">
                        {totalProducts} Items / {totalUnits} Units
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold mr-1.5">সম্ভাব্য লাভ:</span>
                      <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {formatCurrency(Math.max(0, form.saleTotal - form.subtotal))}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-slate-650">
                    <div>
                      <span className="text-slate-500 font-semibold mr-1">মোট কস্ট:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(form.subtotal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold mr-1">মোট বিক্রয়:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(form.saleTotal)}</span>
                    </div>
                    <div className="w-px h-3 bg-border hidden sm:block" />
                    <div>
                      <span className="text-slate-500 font-semibold mr-1">জমা:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(paid)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold mr-1">বাকি:</span>
                      <span className={`font-bold ${due > 0 ? "text-destructive" : "text-slate-700"}`}>
                        {formatCurrency(due)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={async () => {
                const poId = await form.submit();
                if (poId) {
                  // Success is already handled in hook, but we can pass the ID up
                }
              }} loading={form.saving}>
                <ShoppingCart className="h-4 w-4 mr-2" />Save Purchase
              </LoadingButton>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraScanner
        open={form.cameraOpen}
        onClose={() => form.setCameraOpen(false)}
        onDetected={(code) => {
          if (form.activeScanId) {
            form.addSerial(form.activeScanId, code);
          }
        }}
        scanCount={form.activeLine?.serials.length ?? 0}
        addedCount={form.activeLine?.serials.length ?? 0}
      />

      <SupplierFormDialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen} editing={null} />
      <ProductFormDialog open={addProductOpen} onOpenChange={setAddProductOpen} editing={null} />
    </>
  );
}
