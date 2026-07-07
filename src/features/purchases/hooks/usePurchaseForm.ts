import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { usePurchaseActions } from "@/features/purchases/hooks";
import { purchasesService } from "@/services";
import { productDisplayName } from "@/shared/lib/format";
import type { AccountType } from "@/features/accounts/types";
import type { PaymentMethod } from "@/features/sales/types";

const DRAFT_KEY = "pos99_purchase_draft";

export interface DraftLine {
  productId: string;
  name: string;
  baseCost: number;
  extraCost: number;
  saleMode: "amount" | "percent";
  saleInput: string;
  warrantyStartDate?: string;
  warrantyMonths?: number;
  expectedDate?: string;
  serials: string[];
  trackSerials: boolean;
  manualQty: number;
}

export type Tender = {
  id: string;
  method?: string; // "Cash" | "Card" | "Mobile Banking" | "WALLET"
  accountId: string;
  amount: string;
  note?: string;
  manuallyEdited?: boolean;
};

export const methodFromAccountType = (t?: AccountType): PaymentMethod =>
  t === "bank" ? "Card" : t === "mobile_banking" ? "Mobile Banking" : "Cash";

export const lineCost = (l: DraftLine) => l.baseCost + l.extraCost;

export const lineSale = (l: DraftLine, fallback = 0) => {
  const total = lineCost(l);
  const v = Number(l.saleInput) || 0;
  if (l.saleMode === "percent") return total * (1 + v / 100);
  return v > 0 ? total + v : fallback;
};

export function usePurchaseForm({
  editId,
  onSuccess,
  products,
  accounts,
  defaultAccountId,
  selectedWarehouseId,
  open,
}: {
  editId: string | null;
  onSuccess: () => void;
  products: any[];
  accounts: any[];
  defaultAccountId: string;
  selectedWarehouseId: string | null;
  open?: boolean;
}) {
  const { create: createPurchase, update: updatePurchase, addPayment } = usePurchaseActions();

  const [supplierId, setSupplierId] = useState<string>("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [activeProductId, setActiveProductId] = useState<string>("");
  const [activeScanId, setActiveScanId] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState("");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);

  // When editId changes, fetch fresh PO data
  useEffect(() => {
    if (!editId) {
      reset();
      return;
    }
    setEditLoading(true);
    purchasesService.getById(editId).then((po) => {
      if (!po) {
        toast.error("Purchase not found");
        reset();
        setEditLoading(false);
        return;
      }
      setSupplierId(po.supplierId);
      setReference(po.note ?? "");
      const fetchedLines = po.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        baseCost: i.costPrice - (i.extraCost ?? 0),
        extraCost: i.extraCost ?? 0,
        saleMode: "amount" as const,
        saleInput: i.salePrice ? String(Math.max(0, i.salePrice - i.costPrice)) : "",
        warrantyStartDate: i.warrantyStartDate ?? undefined,
        warrantyMonths: i.warrantyMonths ?? undefined,
        expectedDate: po.expectedDate ?? undefined,
        serials: i.serials ?? [],
        trackSerials: (i.serials?.length ?? 0) > 0,
        manualQty: i.qty,
      }));
      setLines(fetchedLines);
      setActiveProductId("");
      setCollapsedSet(new Set(fetchedLines.map((l) => l.productId)));
      if (po.amountPaid > 0) {
        setTenders([{
          id: crypto.randomUUID(),
          accountId: defaultAccountId,
          amount: String(po.amountPaid),
          manuallyEdited: true,
        }]);
      }
      setEditLoading(false);
    }).catch(() => {
      toast.error("Failed to load purchase data");
      reset();
      setEditLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Load Draft (only if not editing)
  useEffect(() => {
    if (editId || open === false) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.supplierId) setSupplierId(parsed.supplierId);
        if (parsed.reference) setReference(parsed.reference);
        if (parsed.lines?.length) {
          setLines(parsed.lines);
          setCollapsedSet(new Set(parsed.lines.map((l: DraftLine) => l.productId)));
        }
        if (parsed.tenders?.length) setTenders(parsed.tenders);
        toast.info("Unsaved draft loaded");
      }
    } catch (e) {
      // ignore
    }
  }, [editId, open]);

  // Save Draft on state changes
  useEffect(() => {
    if (editId || open === false) return;
    const draft = { supplierId, reference, lines, tenders };
    if (supplierId || reference || lines.length > 0 || tenders.length > 0) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* ignore */ }
    } else {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    }
  }, [editId, open, supplierId, reference, lines, tenders]);

  const lineUnits = (l: DraftLine) => (l.trackSerials ? l.serials.length : l.manualQty);
  const subtotal = lines.reduce((s, l) => s + lineUnits(l) * lineCost(l), 0);
  const saleTotal = lines.reduce(
    (s, l) => s + lineUnits(l) * lineSale(l, (products.find((p) => p.id === l.productId)?.price) || 0),
    0
  );

  const reset = (clearDraft = false) => {
    setSupplierId("");
    setLines([]);
    setActiveProductId("");
    setActiveScanId("");
    setScanInput("");
    setReference("");
    setTenders([]);
    setCollapsedSet(new Set());
    if (clearDraft && !editId) {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    }
  };

  const activeLine = lines.find((l) => l.productId === activeScanId);

  const updateLine = (productId: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  };

  const startLine = () => {
    const product = products.find((p) => p.id === activeProductId);
    if (!product) return toast.error("Pick a product");
    if (lines.some((l) => l.productId === product.id))
      return toast.error("Product already added");
    
    setLines((prev) => [
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
        manualQty: 1,
      },
      ...prev,
    ]);
    setCollapsedSet(new Set(lines.map((l) => l.productId)));
    setActiveScanId(product.id);
    setActiveProductId("");
    setTimeout(() => scanRef.current?.focus(), 50);
  };

  const setManualQty = (productId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, manualQty: Math.max(1, qty) } : l
      )
    );
  };

  const lastDupeAtRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });
  
  const addSerial = (productId: string, raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (code.length < 3) {
      toast.error("Serial too short");
      return;
    }
    const key = code.toLowerCase();
    
    const onDraftLine = lines.find((l) => l.serials.some((s) => s.toLowerCase() === key));
    
    // Find which product owns this serial in inventory
    const ownerProduct = !onDraftLine
      ? products.find((p) => p.serials?.some((u: any) => u.serialNumber?.toLowerCase() === key))
      : null;
    
    // A serial is a REAL duplicate only if:
    // 1. It's on the current draft (same PO), OR
    // 2. It exists in inventory AND the owning product has stock > 0 (genuinely in stock)
    //
    // If ownerProduct.stock <= 0 but the serial exists → ORPHANED (from deleted purchase).
    // In that case: clean it up silently and allow the scan.
    const isOrphaned = ownerProduct && Number(ownerProduct.stock ?? 0) <= 0;
    const inInventory = !!ownerProduct && !isOrphaned;
    
    if (isOrphaned) {
      // Silently delete the orphaned serial from DB so inventory stays clean
      fetch(`/api/serials/cleanup-orphaned`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: code }),
      }).catch(() => { /* non-critical */ });
      // Fall through — allow adding this serial to the current PO
    }
    
    if (onDraftLine || inInventory) {
      const now = Date.now();
      if (lastDupeAtRef.current.code === key && now - lastDupeAtRef.current.t < 2000) {
        return;
      }
      lastDupeAtRef.current = { code: key, t: now };
      try { navigator.vibrate?.([60, 40, 60]); } catch { /* noop */ }
      const where = onDraftLine
        ? `এই PO-র "${onDraftLine.name}" লাইনে আগেই scan করা আছে`
        : "এই serial আগে থেকেই inventory-তে আছে";
      toast.error(`ডুপ্লিকেট: ${code}`, { description: where });
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, serials: [...l.serials, code] }
          : l
      )
    );
  };


  const removeSerial = (productId: string, serial: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, serials: l.serials.filter((s) => s !== serial) }
          : l
      )
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
    if (activeProductId === productId) setActiveProductId("");
    if (activeScanId === productId) setActiveScanId("");
  };

  const validTenders = tenders.filter((t) => (Number(t.amount) || 0) > 0 && t.accountId);
  const totalPaid = validTenders.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const addTender = (amount?: number) => {
    setTenders((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        accountId: defaultAccountId,
        amount: amount != null ? String(amount) : "",
        manuallyEdited: true,
      },
    ]);
  };
  
  const updateTender = (id: string, patch: Partial<Tender>) =>
    setTenders((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    
  const removeTender = (id: string) =>
    setTenders((prev) => prev.filter((t) => t.id !== id));

  // Sync tenders with subtotal
  useEffect(() => {
    if (subtotal <= 0) return;
    if (!defaultAccountId) return;
    setTenders((prev) => {
      if (prev.length === 0) {
        return [{
          id: crypto.randomUUID(),
          accountId: defaultAccountId,
          amount: String(subtotal),
          manuallyEdited: false,
        }];
      }
      const [first, ...rest] = prev;
      if (first.manuallyEdited) return prev;
      const desired = String(subtotal);
      if (first.amount === desired) return prev;
      return [{ ...first, amount: desired }, ...rest];
    });
  }, [subtotal, defaultAccountId]);

  const submit = async () => {
    setSaving(true);
    try {
      if (!supplierId) { toast.error("Supplier select করুন"); return null; }
      if (lines.length === 0) { toast.error("কমপক্ষে একটি product যোগ করুন"); return null; }
      
      const empty = lines.find((l) =>
        l.trackSerials ? l.serials.length === 0 : l.manualQty <= 0
      );
      if (empty) {
        toast.error(
          empty.trackSerials
            ? `"${empty.name}" এর জন্য serial scan করুন`
            : `"${empty.name}" এর quantity দিন`
        );
        return null;
      }
      
      if (totalPaid > subtotal + 0.01) {
        toast.error(`জমা মোট কস্টের চেয়ে বেশি হতে পারে না`);
        return null;
      }
      
      const missingFields = lines.find((l) => !l.baseCost || !l.expectedDate);
      if (missingFields) {
        toast.error(`"${missingFields.name}" — Cost ও Expected Date আবশ্যক`);
        return null;
      }

      const itemsPayload = lines.map((l) => {
        const warrantyStart = l.expectedDate || l.warrantyStartDate;
        return {
          productId: l.productId,
          name: l.name,
          qty: lineUnits(l),
          cost: lineCost(l),
          extraCost: l.extraCost || undefined,
          salePrice: lineSale(l, (products.find((p) => p.id === l.productId)?.price) || 0),
          serials: l.trackSerials ? l.serials : undefined,
          warrantyStartDate: warrantyStart,
          warrantyMonths: l.warrantyMonths || undefined,
        };
      });

      if (editId) {
        await updatePurchase(editId, {
          supplierId,
          items: itemsPayload,
          notes: reference || undefined,
          expectedDate: lines[0]?.expectedDate,
          tenders: validTenders.map((t) => {
            if (t.accountId === "WALLET" || t.method === "WALLET") {
              return {
                type: "WALLET",
                amount: Number(t.amount),
                accountId: undefined,
                ref: t.note,
              };
            }
            const acc = accounts.find((a) => a.id === t.accountId);
            return {
              type: methodFromAccountType(acc?.type) === "Cash" ? "CASH" : "BANK",
              amount: Number(t.amount),
              accountId: t.accountId,
              ref: t.note,
            };
          }),
          discount: 0,
          status: "Ordered",
        });
        toast.success(`PO updated`);
        reset(true);
        onSuccess();
        return editId;
      }

      const po = await createPurchase({
        supplierId,
        warehouseId: selectedWarehouseId || undefined,
        items: itemsPayload.map((i) => ({
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          costPrice: i.cost,
          extraCost: i.extraCost,
          salePrice: i.salePrice,
          serials: i.serials,
          warrantyStartDate: i.warrantyStartDate,
          warrantyMonths: i.warrantyMonths,
        })),
        amountPaid: validTenders.reduce((s, t) => s + (Number(t.amount) || 0), 0),
        tenders: validTenders.map((t) => {
          const acc = accounts.find((a) => a.id === t.accountId);
          return {
            type: t.accountId === "WALLET" ? "WALLET" : (methodFromAccountType(acc?.type) === "Cash" ? "CASH" : "BANK"),
            amount: Number(t.amount) || 0,
            accountId: t.accountId === "WALLET" ? undefined : t.accountId,
            ref: t.note,
          };
        }),
        status: "Ordered",
        note: reference || undefined,
        expectedDate: lines[0]?.expectedDate,
      });
      
      const totalUnits = lines.reduce((s, l) => s + lineUnits(l), 0);
      toast.success(`${po.poNumber} — ${totalUnits} unit inventory-তে যোগ হয়েছে`);
      reset(true);
      onSuccess();
      return po.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create purchase");
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Sync draft lines with the latest product.trackSerials
  useEffect(() => {
    setLines((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        const p = products.find((pr) => pr.id === l.productId);
        if (!p) return l;
        const tracked = p.trackSerials !== false;
        if (tracked === l.trackSerials) return l;
        changed = true;
        if (tracked) {
          return { ...l, trackSerials: true, serials: [], manualQty: 1 };
        }
        return {
          ...l,
          trackSerials: false,
          manualQty: Math.max(1, l.serials.length || 1),
          serials: [],
        };
      });
      if (changed) {
        toast.message("Product-এর tracking mode পরিবর্তিত — line reset হয়েছে");
      }
      return changed ? next : prev;
    });
  }, [products]);

  return {
    supplierId, setSupplierId,
    lines, setLines, updateLine, startLine, removeLine, setManualQty,
    activeProductId, setActiveProductId, activeLine,
    scanInput, setScanInput, scanRef, addSerial, removeSerial,
    cameraOpen, setCameraOpen,
    collapsedSet, setCollapsedSet,
    reference, setReference,
    tenders, setTenders, addTender, updateTender, removeTender, validTenders, totalPaid,
    saving, editLoading,
    submit, lineUnits, subtotal, saleTotal, reset,
    activeScanId, setActiveScanId
  };
}
