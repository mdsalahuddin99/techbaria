import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import { productDisplayName, round2 } from '@/shared/lib/format';
import type { SalePayment, Sale, PaymentMethod } from '@/shared/lib/types';
import type { VoucherRow, ReceiptView, HeldSaleForPrint } from '@/features/sales/components';
import { usePosCoreData, posInitKeys } from '@/features/pos';
import { customersApi } from '@/shared/api-client/customers';
import { salesApi } from '@/shared/api-client/sales';
import { apiFetch } from '@/shared/api-client/fetch';
import { saleCreateSchema } from '@/shared/validators/sale';
import { useAccountsByType } from '@/features/accounts/hooks';

export function useCreateSale() {

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
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod>("Cash");
  const [pendingAmount, setPendingAmount] = useState("");
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
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
              amount: Number(p.amount),
              accountId: p.accountId ?? null,
            }))
          : [
              {
                method: sale.paymentMethod as PaymentMethod,
                amount: Number(sale.amountPaid),
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

  // ── Load draft from URL ─────────────────────────────────────────────────
  const loadDraftId = searchParams.get("loadDraft") ?? null;
  useEffect(() => {
    if (!loadDraftId || heldSales.length === 0) return;
    const sale = heldSales.find((h: any) => h.id === loadDraftId);
    if (sale) {
      setVoucherRows(sale.cart || []);
      setVoucherCustomerId(sale.customerId || null);
      if (sale.salesPerson) setSalesPerson(sale.salesPerson);
      if (sale.destination) setDestination(sale.destination);
      if (sale.attention) setAttention(sale.attention);
      if (sale.notes) setNarration(sale.notes);
      
      // Remove query param to prevent reload
      router.replace("/dashboard/sales/create");
    }
  }, [loadDraftId, heldSales, router]);


  // ── Computed totals ─────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => round2(voucherRows.reduce((s, r) => s + r.price * r.qty - (r.discount || 0), 0)),
    [voucherRows],
  );
  const invoiceTotal = round2(Math.max(0, subtotal));

  // Reset auto-apply flag when customer changes
  useEffect(() => {
    setWalletAutoApplied(true);
  }, [voucherCustomerId]);

  // ── Auto-apply wallet payment tender ────────────────────────────────────
  useEffect(() => {
    if (!walletAutoApplied) return;

    if (!voucherCustomerId || !currentCustomer) {
      if (payments.some((p) => p.method === "Wallet")) {
        setPayments((prev) => prev.filter((p) => p.method !== "Wallet"));
      }
      return;
    }

    const walletBalance = Number(currentCustomer?.balance || 0);

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
  }, [voucherCustomerId, invoiceTotal, payments, walletAutoApplied, currentCustomer?.balance]);

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
    async (rawCode: string) => {
      const code = rawCode.trim();
      const qs = new URLSearchParams();
      qs.set("q", code);
      if (selectedWarehouseId) qs.set("warehouseId", selectedWarehouseId);
      
      try {
        const res = await apiFetch<{ items: any[] }>(`/api/products/search?${qs.toString()}`);
        const lowerCode = code.toLowerCase().trim();
        const found = res.items.find(
          (p: any) => (p.barcode || "").toLowerCase() === lowerCode || (p.sku || "").toLowerCase() === lowerCode,
        );
        if (found) {
          addProductToVoucher(found);
          return;
        }
        // Try barcode lookup via serial
        const serial = res.items.find((p: any) => {
          const matchSerials = p.serials?.some((s: any) => (s.serialNumber || "").toLowerCase() === lowerCode || (s.imei || "").toLowerCase() === lowerCode || (s.serial || "").toLowerCase() === lowerCode);
          const matchSerialNumbers = p.serialNumbers?.some((s: any) => (s.serial || "").toLowerCase() === lowerCode || (s.serialNumber || "").toLowerCase() === lowerCode || (s.imei || "").toLowerCase() === lowerCode);
          return matchSerials || matchSerialNumbers;
        });
        if (serial) {
          addProductToVoucher(serial, code);
          return;
        }
        toast.error(`No product found for barcode: ${code}`);
      } catch (err) {
        toast.error(`Error searching barcode: ${code}`);
      }
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
    setPendingMethod("Cash");
    setPendingAmount("");
    setPendingAccountId(null);
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
        }),
      });
      toast.success("Draft saved!");
      refetchHeldSales();
      clearVoucher();
    } catch (err: any) {
      console.error(err);
      if (err.issues) {
        toast.error("Validation Error: " + JSON.stringify(err.issues));
      } else {
        toast.error(err.message || "Failed to save draft");
      }
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

    // Auto-include any pending typed amount
    const pendingAmtNum = round2(Number(pendingAmount) || 0);
    if (pendingAmtNum > 0) {
      finalTenders.push({
        type: pendingMethod,
        amount: pendingAmtNum,
        accountId: pendingAccountId ?? undefined,
      });
    }

    // Recompute due after adding pending tender
    const realTotalPaid = round2(finalTenders.reduce((s, p) => s + p.amount, 0));
    const realDue = round2(invoiceTotal - realTotalPaid);

    if (realDue > 0) {
      if (customerId) {
        // Appending Due tender for unpaid balance
        finalTenders.push({
          type: "Due",
          amount: realDue,
          accountId: undefined,
        });
      } else {
        // Walk-in customer cannot have due. Remaining goes to Cash.
        const existingCash = finalTenders.find((t) => t.type === "Cash");
        if (existingCash) {
          existingCash.amount = round2(existingCash.amount + realDue);
        } else {
          const defCash = cashAccounts.find((a: any) => a.isDefault) ?? cashAccounts[0] ?? null;
          finalTenders.push({
            type: "Cash",
            amount: realDue,
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
      items: voucherRows.map((r) => ({
        productId: r.productId,
        name: r.name,
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


  return {
    searchParams, router, queryClient, editingSaleId, cashAccounts, session,
    selectedWarehouseId, setSelectedWarehouseId, warehouses, categories, users, settings, isLoading,
    voucherRows, setVoucherRows, voucherCustomerId, setVoucherCustomerId,
    voucherCategory, setVoucherCategory, voucherSubcategory, setVoucherSubcategory,
    voucherSearchQuery, setVoucherSearchQuery, showSuggestions, setShowSuggestions,
    payments, setPayments, walletAutoApplied, setWalletAutoApplied,
    receipt, setReceipt, receiptView, setReceiptView,
    cameraOpen, setCameraOpen, cameraScans, setCameraScans,
    isCheckingOut, setIsCheckingOut, saleLoading, setSaleLoading,
    salesPerson, setSalesPerson, destination, setDestination,
    attention, setAttention, invoiceDate, setInvoiceDate,
    narration, setNarration, quickName, setQuickName,
    quickPhone, setQuickPhone, heldOpen, setHeldOpen,
    draftPreview, setDraftPreview, vSearchRef, voucherRowRefs,
    heldSales, refetchHeldSales, currentCustomer, customers,
    loadDraftId, subtotal, invoiceTotal, addProductToVoucher,
    handleBarcodeEnter, changeQty, changeSerials, changeWarranty,
    changeDiscount, removeRow, clearVoucher, holdCurrentSale,
    resumeHeldSale, deleteHeldSale, handleCheckout, handleCameraBarcode,
    pendingMethod, setPendingMethod,
    pendingAmount, setPendingAmount,
    pendingAccountId, setPendingAccountId
  };
}
