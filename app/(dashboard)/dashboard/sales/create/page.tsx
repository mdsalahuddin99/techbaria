"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { toast } from "sonner";
import { formatCurrency, productDisplayName, round2 } from "@/shared/lib/format";
import type { Sale, PaymentMethod, SalePayment } from "@/shared/lib/types";
import CameraScanner from "@/components/CameraScanner";
import {
  InvoicePreview,
  type ReceiptView,
  InvoiceHeader,
  ProductFilterBar,
  InvoiceLineItems,
  PaymentCollector,
  CustomerSidebar,
} from "@/features/sales/components";
import type { VoucherRow } from "@/features/sales/components";
import { usePosScreenData, posInitKeys } from "@/features/pos";
import { customersApi } from "@/shared/api-client/customers";
import { salesApi } from "@/shared/api-client/sales";
import { apiFetch } from "@/shared/api-client/fetch";
import { saleCreateSchema } from "@/shared/validators/sale";
import { CheckCircle2, Printer, Plus, Pause, Trash2, Receipt } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useAccountsByType } from "@/features/accounts/hooks";


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewSale() {
  usePageTitle("New Sale");
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const editingSaleId = searchParams.get("saleId") ?? null;
  const cashAccounts = useAccountsByType("cash");

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  const { products, customers, warehouses, categories, users, settings, isLoading } =
    usePosScreenData(selectedWarehouseId);

  // Auto-select first warehouse on first load
  useEffect(() => {
    if (warehouses?.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // ── Form state ──────────────────────────────────────────────────────────
  const [voucherRows, setVoucherRows] = useState<VoucherRow[]>([]);
  const [voucherCustomerId, setVoucherCustomerId] = useState<string | null>(null);
  const [voucherCategory, setVoucherCategory] = useState("all");
  const [voucherSubcategory, setVoucherSubcategory] = useState("all");
  const [voucherSearchQuery, setVoucherSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [walletAutoApplied, setWalletAutoApplied] = useState(true);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [receiptView, setReceiptView] = useState<ReceiptView>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraScans, setCameraScans] = useState(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [salesPerson, setSalesPerson] = useState("");
  const [narration, setNarration] = useState("");
  const [vat, setVat] = useState<number>(0);
  const [extraCharges, setExtraCharges] = useState<number>(0);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [heldOpen, setHeldOpen] = useState(false);
  const vSearchRef = useRef<HTMLInputElement>(null);
  const voucherRowRefs = useRef<
    Map<string, { serialRef: React.RefObject<HTMLButtonElement>; qtyRef: React.RefObject<HTMLInputElement> }>
  >(new Map());

  // ── Held sales queries ──────────────────────────────────────────────────
  const { data: heldSales = [], refetch: refetchHeldSales } = useQuery({
    queryKey: ["heldSales", selectedWarehouseId],
    queryFn: () => apiFetch<any[]>("/api/pos/held-sales"),
  });

  // ── Load existing sale for edit ─────────────────────────────────────────
  useEffect(() => {
    if (!editingSaleId || products.length === 0) return;
    let cancelled = false;
    (async () => {
      setSaleLoading(true);
      try {
        const sale = await salesApi.getById(editingSaleId);
        if (!sale || cancelled) return;
        const newRows: VoucherRow[] = [];
        for (const item of sale.items) {
          const p = products.find((x: any) => x.id === item.productId);
          if (p) {
            const rowId = crypto.randomUUID();
            voucherRowRefs.current.set(rowId, {
              serialRef: React.createRef<HTMLButtonElement>(),
              qtyRef: React.createRef<HTMLInputElement>(),
            });
            newRows.push({
              id: rowId,
              productId: p.id,
              name: productDisplayName(p),
              qty: item.qty,
              price: Number(item.price),
              discount: Number(item.discount ?? 0),
              serials:
                item.serials && item.serials.length > 0 ? item.serials : [],
              warrantyMonths: item.warrantyMonths ?? undefined,
            });
          }
        }
        setVoucherRows(newRows);
        if (sale.customerId) setVoucherCustomerId(sale.customerId);
        const tenders = sale.payments?.length
          ? sale.payments.map((p: any) => ({
              method: p.method,
              amount: p.amount,
              accountId: p.accountId ?? null,
            }))
          : [
              {
                method: sale.paymentMethod as PaymentMethod,
                amount: sale.amountPaid,
                accountId: null,
              },
            ];
        setPayments(tenders);
        setSalesPerson(sale.salesPerson ?? "");
        setNarration(sale.notes ?? "");
        setVat(sale.vat ?? 0);
        setExtraCharges(sale.extraCharges ?? 0);
      } catch {
        toast.error("Failed to load sale for editing");
        router.replace("/dashboard/sales/create");
      } finally {
        if (!cancelled) setSaleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingSaleId, products.length, router]);

  // ── Computed totals ─────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => round2(voucherRows.reduce((s, r) => s + r.price * r.qty - (r.discount || 0), 0)),
    [voucherRows],
  );
  const invoiceTotal = round2(Math.max(0, subtotal + vat + extraCharges));

  // Reset auto-apply flag when customer changes
  useEffect(() => {
    setWalletAutoApplied(true);
  }, [voucherCustomerId]);

  // ── Auto-apply wallet payment tender ────────────────────────────────────
  useEffect(() => {
    if (!walletAutoApplied) return;

    if (!voucherCustomerId) {
      if (payments.some((p) => p.method === "Wallet")) {
        setPayments((prev) => prev.filter((p) => p.method !== "Wallet"));
      }
      return;
    }

    const customer = customers.find((c: any) => c.id === voucherCustomerId) ?? null;
    const walletBalance = Math.max(0, Number(customer?.balance ?? 0));

    const nonWalletPayments = payments.filter((p) => p.method !== "Wallet");
    const nonWalletPaid = nonWalletPayments.reduce((sum, p) => sum + p.amount, 0);

    const remainingToPay = Math.max(0, invoiceTotal - nonWalletPaid);
    const autoWalletAmount = round2(Math.min(walletBalance, remainingToPay));

    const currentWalletTender = payments.find((p) => p.method === "Wallet");
    const currentWalletAmount = currentWalletTender ? currentWalletTender.amount : 0;

    if (Math.abs(currentWalletAmount - autoWalletAmount) > 0.01) {
      if (autoWalletAmount > 0) {
        const newWalletPayment = { method: "Wallet" as const, amount: autoWalletAmount, accountId: null };
        setPayments([newWalletPayment, ...nonWalletPayments]);
      } else {
        setPayments(nonWalletPayments);
      }
    }
  }, [voucherCustomerId, invoiceTotal, customers, payments, walletAutoApplied]);

  // ── Effective stock (total - already added qty for same product) ─────────
  const effectiveStockOf = useCallback(
    (productId: string) => {
      const product = products.find((p: any) => p.id === productId);
      const globalStock = product?.stock ?? 0;
      const inOtherRows = voucherRows
        .filter((r) => r.productId === productId)
        .reduce((s, r) => s + r.qty, 0);
      return Math.max(0, globalStock - inOtherRows);
    },
    [products, voucherRows],
  );

  // ── Row manipulation ────────────────────────────────────────────────────
  const addProductToVoucher = useCallback(
    (productId: string, scannedSerial?: string) => {
      const product = products.find((p: any) => p.id === productId);
      if (!product) return;
      const existing = voucherRows.find((r) => r.productId === productId);
      const currentQty = existing ? existing.qty : 0;
      const avail = (product.stock ?? 0) - currentQty;
      if (avail <= 0) {
        toast.error(`No more stock available for "${productDisplayName(product)}"`);
        return;
      }

      const allS = (product.serials || []).map((s: any) => s.serialNumber || s.imei || s.serial)
        .concat((product.serialNumbers || []).map((s: any) => s.serial))
        .filter(Boolean);

      if (existing) {
        setVoucherRows((rows) =>
          rows.map((r) => {
            if (r.productId !== productId) return r;
            
            const newSerials = [...r.serials];
            if (scannedSerial && !newSerials.includes(scannedSerial)) {
              newSerials.push(scannedSerial);
            } else if (!scannedSerial && product.trackSerials) {
              const available = allS.filter((s: string) => !newSerials.includes(s));
              if (available.length > 0) {
                newSerials.push(available[0]);
              }
            }
            return { ...r, qty: r.qty + 1, serials: newSerials };
          }),
        );
      } else {
        const rowId = crypto.randomUUID();
        voucherRowRefs.current.set(rowId, {
          serialRef: React.createRef<HTMLButtonElement>(),
          qtyRef: React.createRef<HTMLInputElement>(),
        });
        
        let defaultWarranty = product.warrantyMonths;
        if (defaultWarranty === undefined || defaultWarranty === null) {
          if (product.serials && product.serials.length > 0) {
            const unitWithWarranty = product.serials.find((s: any) => s.warrantyMonths && s.warrantyMonths > 0);
            if (unitWithWarranty) {
              defaultWarranty = unitWithWarranty.warrantyMonths;
            }
          }
        }

        let initialSerial = scannedSerial;
        if (!initialSerial && product.trackSerials) {
          if (allS.length > 0) initialSerial = allS[0];
        }

        setVoucherRows((rows) => [
          ...rows,
          {
            id: rowId,
            productId: product.id,
            name: productDisplayName(product),
            qty: 1,
            price: Number(product.price),
            serials: initialSerial ? [initialSerial] : [],
            warrantyMonths: defaultWarranty ?? undefined,
          },
        ]);
      }
    },
    [products, voucherRows],
  );

  const handleBarcodeEnter = useCallback(
    async (code: string) => {
      const found = products.find(
        (p: any) => p.barcode === code || p.sku === code,
      );
      if (found) {
        addProductToVoucher(found.id);
        return;
      }
      // Try barcode lookup via serial
      const serial = products.find((p: any) =>
        p.serials?.some((s: any) => s.serialNumber === code || s.imei === code),
      );
      if (serial) {
        addProductToVoucher(serial.id, code);
        return;
      }
      toast.error(`No product found for barcode: ${code}`);
    },
    [products, addProductToVoucher],
  );

  const changeQty = useCallback((rowId: string, qty: number) => {
    setVoucherRows((rows) =>
      rows.map((r) => {
        if (r.id !== rowId) return r;
        const newSerials = r.serials.length > qty ? r.serials.slice(0, qty) : r.serials;
        return { ...r, qty, serials: newSerials };
      }),
    );
  }, []);

  const changeSerials = useCallback((rowId: string, serials: string[]) => {
    setVoucherRows((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, serials } : r)),
    );
  }, []);

  const changeWarranty = useCallback((rowId: string, months: number) => {
    setVoucherRows((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, warrantyMonths: months } : r)),
    );
  }, []);

  const changeDiscount = useCallback((rowId: string, discount: number) => {
    setVoucherRows((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, discount } : r)),
    );
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setVoucherRows((rows) => rows.filter((r) => r.id !== rowId));
    voucherRowRefs.current.delete(rowId);
  }, []);

  const clearVoucher = useCallback(() => {
    setVoucherRows([]);
    setVoucherCustomerId(null);
    setPayments([]);
    setWalletAutoApplied(true);
    voucherRowRefs.current.clear();
    setVoucherCategory("all");
    setVoucherSubcategory("all");
    setVoucherSearchQuery("");
    setShowSuggestions(false);
    setSalesPerson("");
    setNarration("");
    setVat(0);
    setExtraCharges(0);
  }, []);

  // ── Held Sales ──────────────────────────────────────────────────────────
  const holdCurrentSale = async () => {
    if (voucherRows.length === 0) return;
    try {
      await apiFetch("/api/pos/held-sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: voucherCustomerId,
          customerName: voucherCustomerId ? customers.find((c: any) => c.id === voucherCustomerId)?.name : quickName || "Walk-in",
          cart: voucherRows,
          discount: 0,
        }),
      });
      toast.success("Sale put on hold");
      refetchHeldSales();
      clearVoucher();
    } catch (err: any) {
      toast.error(err.message || "Failed to hold sale");
    }
  };

  const resumeHeldSale = async (id: string) => {
    const sale = heldSales.find((h) => h.id === id);
    if (!sale) return;
    setVoucherRows(sale.cart);
    setVoucherCustomerId(sale.customerId || null);
    try {
      await apiFetch(`/api/pos/held-sales?id=${id}`, { method: "DELETE" });
      refetchHeldSales();
      setHeldOpen(false);
    } catch {
      // Ignored
    }
  };

  const deleteHeldSale = async (id: string) => {
    try {
      await apiFetch(`/api/pos/held-sales?id=${id}`, { method: "DELETE" });
      refetchHeldSales();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // ── Checkout ─────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (voucherRows.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    const totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0));
    const due = round2(invoiceTotal - totalPaid);

    // Quick-create customer for credit sales if needed
    let customerId = voucherCustomerId;
    if (!customerId && due > 0 && quickName.trim()) {
      try {
        const cust = await customersApi.create({
          name: quickName.trim(),
          phone: quickPhone.trim() || undefined,
        });
        customerId = cust.id;
        setVoucherCustomerId(cust.id);
        queryClient.invalidateQueries({ queryKey: posInitKeys.all });
      } catch {
        toast.error("Failed to create customer");
        return;
      }
    }

    const finalTenders = payments
      .filter((p) => p.amount > 0)
      .map((p) => ({
        type: p.method,
        amount: p.amount,
        accountId: p.accountId ?? undefined,
      }));

    if (due > 0) {
      if (customerId) {
        // Appending Due tender for unpaid balance
        finalTenders.push({
          type: "Due",
          amount: due,
          accountId: undefined,
        });
      } else {
        // Walk-in customer cannot have due. Remaining goes to Cash.
        const existingCash = finalTenders.find((t) => t.type === "Cash");
        if (existingCash) {
          existingCash.amount = round2(existingCash.amount + due);
        } else {
          const defCash = cashAccounts.find((a: any) => a.isDefault) ?? cashAccounts[0] ?? null;
          finalTenders.push({
            type: "Cash",
            amount: due,
            accountId: defCash?.id ?? undefined,
          });
        }
      }
    }

    if (finalTenders.length === 0) {
      const defCash = cashAccounts.find((a: any) => a.isDefault) ?? cashAccounts[0] ?? null;
      finalTenders.push({
        type: "Cash",
        amount: 0,
        accountId: defCash?.id ?? undefined,
      });
    }

    const payload = {
      customerId: customerId ?? undefined,
      warehouseId: selectedWarehouseId ?? undefined,
      discount: 0,
      channel: "POS" as const,
      salesPerson: salesPerson || undefined,
      notes: narration || undefined,
      vat,
      extraCharges,
      items: voucherRows.map((r) => ({
        productId: r.productId,
        qty: r.qty,
        price: r.price,
        discount: r.discount ?? 0,
        serials: r.serials.length > 0 ? r.serials : undefined,
        warrantyMonths: r.warrantyMonths ?? undefined,
      })),
      tenders: finalTenders,
    };


    const parsed = saleCreateSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Validation error");
      return;
    }

    setIsCheckingOut(true);
    try {
      const sale = editingSaleId
        ? await salesApi.update(editingSaleId, payload)
        : await salesApi.create(payload);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: posInitKeys.byWarehouse(selectedWarehouseId) });
      setReceipt(sale);
      setReceiptView("invoice");
      toast.success(editingSaleId ? "Invoice updated!" : "Invoice saved!");
      if (!editingSaleId) clearVoucher();
    } catch (err: any) {
      toast.error(err?.message ?? "Checkout failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ── Camera barcode callback ──────────────────────────────────────────────
  const handleCameraBarcode = useCallback(
    (code: string) => {
      setCameraScans((n) => n + 1);
      handleBarcodeEnter(code).then(() => setCameraScans((n) => n + 1));
    },
    [handleBarcodeEnter],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-[1600px] mx-auto pb-10">
      {/* Tier 1: Left Sidebar */}
      <div className="w-full lg:w-64 shrink-0">
        <CustomerSidebar
          customers={customers}
          customerId={voucherCustomerId}
          onCustomerChange={setVoucherCustomerId}
        />
      </div>

      {/* Right Content Grouped into Center (Tier 2) and Right (Tier 3) */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-w-0">
        {/* Tier 2: Center List (Invoice & Items) */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Invoice card */}
          <div className="bg-card rounded-[4px] border border-border p-4 md:p-6 space-y-5">
            <InvoiceHeader
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId}
              onWarehouseChange={(id) => {
                setSelectedWarehouseId(id);
                clearVoucher();
              }}
              editMode={!!editingSaleId}
            />

            <div className="border-t border-border" />

            {/* Product search + filter bar */}
            {!selectedWarehouseId ? (
              <div className="text-center py-6 text-sm text-slate-400">
                {isLoading ? "Loading POS data..." : "No warehouse selected"}
              </div>
            ) : (
              <>
                <ProductFilterBar
                  categories={categories}
                  availableProducts={products}
                  invoiceRows={voucherRows}
                  category={voucherCategory}
                  subcategory={voucherSubcategory}
                  searchQuery={voucherSearchQuery}
                  showSuggestions={showSuggestions}
                  hasRows={voucherRows.length > 0}
                  onCategoryChange={setVoucherCategory}
                  onSubcategoryChange={setVoucherSubcategory}
                  onSearchChange={(v, show) => {
                    setVoucherSearchQuery(v);
                    setShowSuggestions(show);
                  }}
                  onShowSuggestions={setShowSuggestions}
                  onAddProduct={addProductToVoucher}
                  onBarcodeEnter={handleBarcodeEnter}
                  onClear={clearVoucher}
                  onOpenCamera={() => setCameraOpen(true)}
                  searchInputRef={vSearchRef}
                />

                <div className="border-t border-border" />

                {/* Line items table */}
                <InvoiceLineItems
                  rows={voucherRows}
                  products={products}
                  onChangeQty={changeQty}
                  onChangeSerials={changeSerials}
                  onChangeWarranty={changeWarranty}
                  onChangeDiscount={changeDiscount}
                  onRemoveRow={removeRow}
                  effectiveStockOf={effectiveStockOf}
                  searchInputRef={vSearchRef}
                />

                {/* Invoice subtotal summary (above payment) */}
                {voucherRows.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="text-xs text-slate-500 font-medium">
                      {voucherRows.length} item{voucherRows.length !== 1 ? "s" : ""} ·{" "}
                      Subtotal:{" "}
                      <span className="font-extrabold text-slate-800 tabular-nums">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons / additional fields for smaller screens (< xl) */}
          <div className="xl:hidden space-y-5">
              <div className="bg-card rounded-[4px] border border-border p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Sales Person
                  </label>
                  <Select value={salesPerson} onValueChange={setSalesPerson}>
                    <SelectTrigger className="h-9 border-border bg-card text-sm rounded-[4px]">
                      <SelectValue placeholder="Select sales person…" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u: any) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name} ({u.role.toLowerCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Add VAT (৳)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={vat || ""}
                    onChange={(e) => setVat(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="h-9 text-right text-sm border-border bg-card rounded-[4px]"
                  />
                </div>
              </div>

            {/* Payment card */}
            {voucherRows.length > 0 && (
              <PaymentCollector
                subtotal={subtotal}
                vat={vat}
                extraCharges={extraCharges}
                payments={payments}
                onAddPayment={(p) => setPayments((prev) => [...prev, p])}
                onRemovePayment={(idx) => {
                  const removed = payments[idx];
                  if (removed?.method === "Wallet") {
                    setWalletAutoApplied(false);
                  }
                  setPayments((prev) => prev.filter((_, i) => i !== idx));
                }}
                customerId={voucherCustomerId}
                customers={customers}
                quickName={quickName}
                quickPhone={quickPhone}
                onQuickNameChange={setQuickName}
                onQuickPhoneChange={setQuickPhone}
              />
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-4 rounded-[4px]">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-border text-slate-600 h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs"
                  onClick={() => router.push("/dashboard/sales")}
                >
                  Cancel
                </Button>

                <Popover open={heldOpen} onOpenChange={setHeldOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 relative rounded-[4px] font-semibold hover:bg-secondary text-xs">
                      Held Sales
                      {heldSales.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] h-5 w-5 flex items-center justify-center rounded-full font-bold">
                          {heldSales.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-2 z-50">
                    {heldSales.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">No held sales</p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto space-y-1">
                        {heldSales.map((h: any) => (
                          <li key={h.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary">
                            <button
                              type="button"
                              className="flex-1 min-w-0 text-left"
                              onClick={() => resumeHeldSale(h.id)}
                            >
                              <p className="text-sm font-medium truncate">{h.customerName || "Walk-in"}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {h.cart.reduce((s: any, i: any) => s + i.qty, 0)} items
                              </p>
                            </button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive shrink-0"
                              onClick={() => deleteHeldSale(h.id)}
                              title="Discard"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </PopoverContent>
                </Popover>

                {voucherRows.length > 0 && !editingSaleId && (
                  <Button variant="outline" className="h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs" onClick={holdCurrentSale}>
                    <Pause className="h-4 w-4 mr-1.5" /> Hold
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {receipt && (
                  <>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-sm rounded-[4px] font-semibold hover:bg-secondary text-xs"
                      onClick={() => setReceiptView("thermal")}
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> Thermal
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-sm rounded-[4px] font-semibold hover:bg-secondary text-xs"
                      onClick={() => setReceiptView("invoice")}
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> A4
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-sm rounded-[4px] font-semibold hover:bg-secondary text-xs"
                      onClick={() => {
                        clearVoucher();
                        setReceipt(null);
                        setReceiptView(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> New Invoice
                    </Button>
                  </>
                )}
                <LoadingButton
                  loading={isCheckingOut || saleLoading}
                  disabled={voucherRows.length === 0 || !selectedWarehouseId}
                  className="h-10 bg-primary text-primary-foreground shadow-none hover:bg-primary/95 min-w-32 rounded-[4px] font-bold text-xs"
                  onClick={handleCheckout}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {editingSaleId ? "Update Invoice" : "Save Invoice"}
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 3: Right Summary & Payment (shown side-by-side only on xl screens) */}
        <div className="hidden xl:flex flex-col w-72 shrink-0 gap-5 sticky top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
          {voucherRows.length === 0 ? (
            <div className="bg-card rounded-[4px] border border-border p-6 text-center text-slate-400">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-25" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No active invoice</p>
              <p className="text-[11px] text-slate-400 mt-1">Add items to configure payment details.</p>
            </div>
          ) : (
            <>
              {/* Additional Fields (Sales Person, VAT, Extra Charges) */}
            <div className="bg-card rounded-[4px] border border-border p-3 space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Additional Details
              </h3>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Sales Person
                  </label>
                  <Select value={salesPerson} onValueChange={setSalesPerson}>
                    <SelectTrigger className="h-8 border-border bg-card text-xs rounded-[4px]">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u: any) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name} ({u.role.toLowerCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    VAT (৳)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={vat || ""}
                    onChange={(e) => setVat(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="h-8 text-right text-xs border-border bg-card rounded-[4px]"
                  />
                </div>
              </div>
            </div>

            {/* Payment card */}
            <PaymentCollector
              subtotal={subtotal}
              vat={vat}
              extraCharges={extraCharges}
              payments={payments}
              onAddPayment={(p) => setPayments((prev) => [...prev, p])}
              onRemovePayment={(idx) => {
                const removed = payments[idx];
                if (removed?.method === "Wallet") {
                  setWalletAutoApplied(false);
                }
                setPayments((prev) => prev.filter((_, i) => i !== idx));
              }}
              customerId={voucherCustomerId}
              customers={customers}
              quickName={quickName}
              quickPhone={quickPhone}
              onQuickNameChange={setQuickName}
              onQuickPhoneChange={setQuickPhone}
            />

            {/* Action buttons */}
            <div className="bg-card border border-border p-5 rounded-[4px] space-y-4">
              <div className="flex flex-col gap-2.5">
                <LoadingButton
                  loading={isCheckingOut || saleLoading}
                  disabled={voucherRows.length === 0 || !selectedWarehouseId}
                  className="w-full h-11 bg-primary text-primary-foreground shadow-none hover:bg-primary/95 rounded-[4px] font-bold text-sm"
                  onClick={handleCheckout}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {editingSaleId ? "Update Invoice" : "Save Invoice"}
                </LoadingButton>

                {receipt && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
                      onClick={() => setReceiptView("thermal")}
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> Thermal
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
                      onClick={() => setReceiptView("invoice")}
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> A4
                    </Button>
                  </div>
                )}

                {receipt && (
                  <Button
                    variant="outline"
                    className="w-full border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
                    onClick={() => {
                      clearVoucher();
                      setReceipt(null);
                      setReceiptView(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> New Invoice
                  </Button>
                )}
              </div>

              <div className="border-t border-border my-2" />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-slate-600 h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs"
                  onClick={() => router.push("/dashboard/sales")}
                >
                  Cancel
                </Button>

                <Popover open={heldOpen} onOpenChange={setHeldOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 relative rounded-[4px] font-semibold hover:bg-secondary text-xs">
                      Held
                      {heldSales.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] h-5 w-5 flex items-center justify-center rounded-full font-bold">
                          {heldSales.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-2 z-50">
                    {heldSales.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">No held sales</p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto space-y-1">
                        {heldSales.map((h: any) => (
                          <li key={h.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary">
                            <button
                              type="button"
                              className="flex-1 min-w-0 text-left"
                              onClick={() => resumeHeldSale(h.id)}
                            >
                              <p className="text-sm font-medium truncate">{h.customerName || "Walk-in"}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {h.cart.reduce((s: any, i: any) => s + i.qty, 0)} items
                              </p>
                            </button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive shrink-0"
                              onClick={() => deleteHeldSale(h.id)}
                              title="Discard"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </PopoverContent>
                </Popover>

                {voucherRows.length > 0 && !editingSaleId && (
                  <Button variant="outline" className="h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs" onClick={holdCurrentSale}>
                    <Pause className="h-4 w-4 mr-1.5" /> Hold
                  </Button>
                )}
              </div>
            </div>
          </>
          )}
        </div>
      </div>

      {/* Camera barcode scanner */}
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={handleCameraBarcode}
        scanCount={cameraScans}
        addedCount={cameraScans}
      />

      {/* Invoice preview / print */}
      {receipt && receiptView && (
        <InvoicePreview
          sale={receipt}
          settings={settings}
          view={receiptView}
          onClose={() => setReceiptView(null)}
          onPickThermal={() => setReceiptView("thermal")}
          onPickInvoice={() => setReceiptView("invoice")}
        />
      )}
    </div>
  );
}

/** @deprecated alias kept to avoid type errors during migration */
type SaleItemRow = VoucherRow;
