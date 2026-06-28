"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";

import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { toast } from "sonner";
import { formatCurrency, productDisplayName, round2 } from "@/shared/lib/format";
import type { Sale, PaymentMethod, SalePayment } from "@/shared/lib/types";
import CameraScanner from "@/components/CameraScanner";
import {
  InvoicePreview,
  type ReceiptView,
  DraftInvoicePreview,
  type HeldSaleForPrint,
  InvoiceHeader,
  ProductFilterBar,
  InvoiceLineItems,
  PaymentCollector,
  CustomerSidebar,
} from "@/features/sales/components";
import type { VoucherRow } from "@/features/sales/components";
import { usePosCoreData, posInitKeys } from "@/features/pos";
import { customersApi } from "@/shared/api-client/customers";
import { salesApi } from "@/shared/api-client/sales";
import { apiFetch } from "@/shared/api-client/fetch";
import { saleCreateSchema } from "@/shared/validators/sale";
import { CheckCircle2, Printer, Plus, Pause, Trash2, Receipt, Search, FileText, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useAccountsByType } from "@/features/accounts/hooks";


// ─── Page ─────────────────────────────────────────────────────────────────────

export function CreateSaleClient() {
  usePageTitle("New Sale");
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const editingSaleId = searchParams.get("saleId") ?? null;
  const cashAccounts = useAccountsByType("cash");
  const { session } = useAuth();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  const { warehouses, categories, users, settings, isLoading } =
    usePosCoreData();

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
  const [destination, setDestination] = useState("");
  const [attention, setAttention] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
  });
  const [narration, setNarration] = useState("");
  const [vat, setVat] = useState<number>(0);
  const [extraCharges, setExtraCharges] = useState<number>(0);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [heldOpen, setHeldOpen] = useState(false);
  const [draftPreview, setDraftPreview] = useState<HeldSaleForPrint | null>(null);
  const vSearchRef = useRef<HTMLInputElement>(null);

  const voucherRowRefs = useRef<
    Map<string, { serialRef: React.RefObject<HTMLButtonElement>; qtyRef: React.RefObject<HTMLInputElement> }>
  >(new Map());

  // ── Held sales queries ──────────────────────────────────────────────────
  const { data: heldSales = [], refetch: refetchHeldSales } = useQuery({
    queryKey: ["heldSales", selectedWarehouseId],
    queryFn: () => apiFetch<any[]>("/api/pos/held-sales"),
  });

  // ── Fetch current customer (for wallet balance) ─────────────────────────
  const { data: currentCustomer } = useQuery({
    queryKey: ["customer", voucherCustomerId],
    queryFn: () => voucherCustomerId ? customersApi.getById(voucherCustomerId) : null,
    enabled: !!voucherCustomerId,
  });
  const customers = useMemo(() => currentCustomer ? [currentCustomer] : [], [currentCustomer]);

  // ── Load existing sale for edit ─────────────────────────────────────────
  useEffect(() => {
    if (!editingSaleId) return;
    let cancelled = false;
    (async () => {
      setSaleLoading(true);
      try {
        const sale = await salesApi.getById(editingSaleId);
        if (!sale || cancelled) return;
        const newRows: VoucherRow[] = [];
        for (const item of sale.items) {
          const rowId = crypto.randomUUID();
          voucherRowRefs.current.set(rowId, {
            serialRef: React.createRef<HTMLButtonElement>(),
            qtyRef: React.createRef<HTMLInputElement>(),
          });
          newRows.push({
            id: rowId,
            productId: item.productId,
            name: item.name,
            qty: item.qty,
            price: Number(item.price),
            discount: Number(item.discount ?? 0),
            serials:
              item.serials && item.serials.length > 0 ? item.serials : [],
            warrantyMonths: item.warrantyMonths ?? undefined,
          });
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
        setDestination(sale.destination ?? "");
        setAttention(sale.attention ?? "");
        if (sale.date) {
          const tzoffset = (new Date()).getTimezoneOffset() * 60000;
          setInvoiceDate(new Date(new Date(sale.date).getTime() - tzoffset).toISOString().split('T')[0]);
        }
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
  }, [editingSaleId, router]);

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

    // Wallet balance auto-apply disabled temporarily without full customer loading
    // The CustomerSidebar now fetches the customer, so we might need to rely on customer lookup
    // or we can remove the auto-apply feature, or fetch customer here.
    const walletBalance = 0; // TODO: Implement if needed for async

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
  }, [voucherCustomerId, invoiceTotal, payments, walletAutoApplied]);

  // Removed effectiveStockOf since products aren't loaded upfront

  // ── Row manipulation ────────────────────────────────────────────────────
  const addProductToVoucher = useCallback(
    (product: any, scannedSerial?: string) => {
      if (!product) return;
      const productId = product.id;
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
            originalProduct: product,
          },
        ]);
      }
    },
    [voucherRows],
  );

  const handleBarcodeEnter = useCallback(
    async (code: string) => {
      const qs = new URLSearchParams();
      qs.set("q", code);
      if (selectedWarehouseId) qs.set("warehouseId", selectedWarehouseId);
      
      const res = await apiFetch<{ items: any[] }>(`/api/products/search?${qs.toString()}`);
      const found = res.items.find(
        (p: any) => p.barcode === code || p.sku === code,
      );
      if (found) {
        addProductToVoucher(found);
        return;
      }
      // Try barcode lookup via serial
      const serial = res.items.find((p: any) =>
        p.serials?.some((s: any) => s.serialNumber === code || s.imei === code || s.serial === code),
      );
      if (serial) {
        addProductToVoucher(serial, code);
        return;
      }
      toast.error(`No product found for barcode: ${code}`);
    },
    [selectedWarehouseId, addProductToVoucher],
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
    setDestination("");
    setAttention("");
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    setInvoiceDate((new Date(Date.now() - tzoffset)).toISOString().split('T')[0]);
    setNarration("");
    setVat(0);
    setExtraCharges(0);
  }, [session]);

  // ── Context event listeners for global Command Palette ────────────────────
  useEffect(() => {
    const handleFocusProduct = () => {
      vSearchRef.current?.focus();
    };
    const handleFocusCustomer = () => {
      document.getElementById("pos-customer-search-btn")?.click();
    };
    const handleClearCart = () => {
      clearVoucher();
    };
    const handleQuickDiscount = () => {
      const discountInput = document.querySelector<HTMLInputElement>("input[name='row-discount']");
      if (discountInput) {
        discountInput.focus();
        discountInput.select();
      } else {
        toast.info("Add an item first to apply a discount");
      }
    };
    const handleAddProductById = async (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        // We'd need to fetch the product by ID here, but for now it's only triggered by cmd palette which might not pass full product
        // Actually, if we use a separate fetch:
        try {
          const res = await apiFetch<{ items: any[] }>(`/api/products/search?q=${customEvent.detail}`);
          const p = res.items.find(x => x.id === customEvent.detail);
          if (p) addProductToVoucher(p);
        } catch {
          // Ignore fetch errors
        }
      }
    };
    const handleSelectCustomerById = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail !== undefined) {
        setVoucherCustomerId(customEvent.detail);
      }
    };

    window.addEventListener("cmd:focus-product-search", handleFocusProduct);
    window.addEventListener("cmd:focus-customer-search", handleFocusCustomer);
    window.addEventListener("cmd:clear-cart", handleClearCart);
    window.addEventListener("cmd:quick-discount", handleQuickDiscount);
    window.addEventListener("cmd:add-product-by-id", handleAddProductById);
    window.addEventListener("cmd:select-customer-by-id", handleSelectCustomerById);

    return () => {
      window.removeEventListener("cmd:focus-product-search", handleFocusProduct);
      window.removeEventListener("cmd:focus-customer-search", handleFocusCustomer);
      window.removeEventListener("cmd:clear-cart", handleClearCart);
      window.removeEventListener("cmd:quick-discount", handleQuickDiscount);
      window.removeEventListener("cmd:add-product-by-id", handleAddProductById);
      window.removeEventListener("cmd:select-customer-by-id", handleSelectCustomerById);
    };
  }, [clearVoucher, addProductToVoucher]);

  // ── Held Sales ──────────────────────────────────────────────────────────
  const holdCurrentSale = async () => {
    if (voucherRows.length === 0) return;
    try {
      await apiFetch("/api/pos/held-sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: voucherCustomerId,
          customerName: quickName || "", // Customer name isn't readily available without fetch, using quickName as fallback
          cart: voucherRows,
          discount: 0,
          salesPerson: salesPerson || undefined,
          destination: destination || undefined,
          attention: attention || undefined,
          notes: narration || undefined,
          vat,
          extraCharges,
        }),
      });
      toast.success("Draft saved!");
      refetchHeldSales();
      clearVoucher();
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    }
  };

  const resumeHeldSale = async (id: string) => {
    const sale = heldSales.find((h: any) => h.id === id);
    if (!sale) return;
    setVoucherRows(sale.cart || []);
    setVoucherCustomerId(sale.customerId || null);
    if (sale.salesPerson) setSalesPerson(sale.salesPerson);
    if (sale.destination) setDestination(sale.destination);
    if (sale.attention) setAttention(sale.attention);
    if (sale.notes) setNarration(sale.notes);
    if (sale.vat) setVat(sale.vat);
    if (sale.extraCharges) setExtraCharges(sale.extraCharges);
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
      date: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
      salesPerson: salesPerson || undefined,
      destination: destination || undefined,
      attention: attention || undefined,
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

      // Show success UI immediately — do NOT await invalidation
      setReceipt(sale);
      setReceiptView("invoice");
      toast.success(editingSaleId ? "Invoice updated!" : "Invoice saved!");
      if (!editingSaleId) clearVoucher();

      // Invalidate in background — sales list will re-fetch behind the scenes
      // without blocking the receipt modal from appearing.
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      // Mark POS init data (products/customers) stale — will refetch next interaction
      queryClient.invalidateQueries({
        queryKey: posInitKeys.byWarehouse(selectedWarehouseId),
        refetchType: "none",
      });
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
    <div className="w-full max-w-[1600px] mx-auto p-0 space-y-6">
      {/* ── Premium POS Header (Light Theme) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/60 p-5 sm:p-6 shadow-sm">
        {/* Subtle background glow for premium feel */}
        <div className="absolute -top-24 -right-24 h-64 w-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Side: Title & Info */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                POS Active
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {editingSaleId ? "Edit Sale Invoice" : "New Sale Invoice"}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-lg">
              {editingSaleId
                ? "Update the existing invoice details."
                : "Add products and record payment. Start scanning to add items to cart."}
            </p>
          </div>

          {/* Right Side: Actions & Search */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/sales")}
              className="h-10 px-4 border-slate-200 bg-white text-sm font-semibold rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Search className="h-4 w-4 text-slate-400" />
              Invoice Search
            </Button>

            <Popover open={heldOpen} onOpenChange={setHeldOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-4 border-slate-200 bg-white text-sm font-semibold rounded-lg hover:bg-slate-50 text-slate-700 relative flex items-center gap-2 shadow-sm transition-colors"
                >
                  <FileText className="h-4 w-4 text-slate-400" />
                  Draft Invoices
                  {heldSales.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full font-bold shadow-sm">
                      {heldSales.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-0 z-50">
                <div className="px-3 py-2.5 border-b bg-muted/40">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Draft Invoices / Quotations</h3>
                </div>
                {heldSales.length === 0 ? (
                  <div className="p-6 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No draft invoices</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Hold a sale to create a draft</p>
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                    {heldSales.map((h: any) => {
                      const cartItems = (h.cart || []).filter((i: any) => !i._meta);
                      const draftTotal = round2(
                        cartItems.reduce((s: number, i: any) => s + i.price * i.qty - (i.discount || 0), 0)
                        + (h.vat || 0) + (h.extraCharges || 0)
                      );
                      const itemCount = cartItems.reduce((s: number, i: any) => s + i.qty, 0);
                      const heldDate = new Date(h.heldAt);
                      return (
                        <li key={h.id} className="p-2.5 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              className="flex-1 min-w-0 text-left"
                              onClick={() => resumeHeldSale(h.id)}
                              title="Resume this draft"
                            >
                              <p className="text-sm font-semibold truncate text-slate-800">
                                {h.customerName || h.customer?.name || "No Customer"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-primary tabular-nums">
                                  {formatCurrency(draftTotal)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground/60" />
                                <span className="text-[10px] text-muted-foreground">
                                  {heldDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                                  {heldDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </span>
                              </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500 hover:text-primary"
                                onClick={() => {
                                  setDraftPreview(h);
                                  setHeldOpen(false);
                                }}
                                title="Print Quotation"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive"
                                onClick={() => deleteHeldSale(h.id)}
                                title="Discard"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </PopoverContent>
            </Popover>

            {voucherRows.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearVoucher}
                className="h-10 px-4 text-sm font-semibold rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cart
              </Button>
            )}

            {/* Global Search trigger bar inside the page */}
            <div className="w-full sm:w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search products, customers, orders..."
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("cmd:open-palette"));
                }}
                className="pl-9 h-10 bg-white border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg cursor-pointer w-full focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 transition-colors shadow-sm"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tier 1: Left Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <CustomerSidebar
            customers={[]}
            customerId={voucherCustomerId}
            onCustomerChange={setVoucherCustomerId}
          />
        </div>

        {/* Right Content Column */}
        <div className="flex-1 space-y-6 min-w-0 pb-20 relative">
          {/* Invoice card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-4 md:p-6 space-y-5 transition-shadow hover:shadow-xl">
            {warehouses?.length > 1 && (
              <>
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
              </>
            )}

            {/* Product search + filter bar */}
            {!selectedWarehouseId ? (
              <div className="text-center py-6 text-sm text-slate-400">
                {isLoading ? "Loading POS data..." : "No warehouse selected"}
              </div>
            ) : (
              <>
                <ProductFilterBar
                  categories={categories}
                  warehouseId={selectedWarehouseId}
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
                  onChangeQty={changeQty}
                  onChangeSerials={changeSerials}
                  onChangeWarranty={changeWarranty}
                  onChangeDiscount={changeDiscount}
                  onRemoveRow={removeRow}
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

          {/* Bottom Section: Payment & Details (only when there are items in the cart) */}
          {voucherRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sub-column: Additional Details */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-secondary/20 rounded-2xl border border-border/50 p-5 space-y-4 shadow-md transition-shadow hover:shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-border pb-2">
                    Additional Details
                  </h3>
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Sales Person
                        </label>
                        <Input
                          type="text"
                          value={salesPerson}
                          onChange={(e) => setSalesPerson(e.target.value)}
                          placeholder="Write sales person name…"
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Invoice Date
                        </label>
                        <Input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Destination
                        </label>
                        <Input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="Destination…"
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Attention
                        </label>
                        <Input
                          type="text"
                          value={attention}
                          onChange={(e) => setAttention(e.target.value)}
                          placeholder="Attention…"
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Invoice Notes / Narration
                      </label>
                      <textarea
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                        placeholder="Write invoice notes or narration here..."
                        rows={3}
                        className="w-full text-sm border border-border bg-card rounded-[4px] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sub-column: Payment Collector */}
              <div className="lg:col-span-8 space-y-4">
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
              </div>
            </div>
          )}

          {/* Checkout & Action Buttons (Sticky at bottom of viewport) */}
          {voucherRows.length > 0 && (
            <div className="sticky bottom-0 bg-card/80 backdrop-blur-xl border-t border-x border-border/50 p-5 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-wrap items-center justify-between gap-4 z-30 transition-all duration-300">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-border text-slate-600 h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs"
                  onClick={() => router.push("/dashboard/sales")}
                >
                  Cancel
                </Button>

                {voucherRows.length > 0 && !editingSaleId && (
                  <Button variant="outline" className="h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs" onClick={holdCurrentSale}>
                    <FileText className="h-4 w-4 mr-1.5" /> Save Draft
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {receipt && (
                  <>
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
                    <Button
                      variant="outline"
                      className="border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
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
          )}
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
      {/* Draft Invoice Quotation Preview/Print */}
      <DraftInvoicePreview
        draft={draftPreview}
        settings={settings}
        open={!!draftPreview}
        onClose={() => setDraftPreview(null)}
      />
      </div>
    </div>
  );
}

/** @deprecated alias kept to avoid type errors during migration */
type SaleItemRow = VoucherRow;
