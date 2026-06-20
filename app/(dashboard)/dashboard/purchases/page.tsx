"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSuppliers } from "@/features/suppliers/hooks";
import { usePurchases, usePurchaseActions } from "@/features/purchases/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useAuth } from "@/features/auth";
import { useProductsQuery } from "@/features/products/hooks";
import { useActiveAccounts, useAccountBalances } from "@/features/accounts/hooks";
import { flattenAccountsGroupedByType } from "@/features/accounts/tree";
import { effectiveReorderPoint } from "@/features/products/bundle";
import { PageHeader } from "@/shared/components";
import { useSearchHandler } from "@/shared/hooks/use-search-handler";

import {
  PurchaseList,
  PurchaseFormDialog,
  PurchaseDetailSheet,
  PurchaseInvoiceDialog,
} from "@/features/purchases/components";

export default function Purchases() {
  usePageTitle("Purchases");
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <PurchasesInner />
    </Suspense>
  );
}

function PurchasesInner() {
  const { data: suppliers } = useSuppliers();
  const products = ((useProductsQuery().data as any)?.items ?? []) as any[];
  const { delete: deletePurchase } = usePurchaseActions();
  const allPurchases = usePurchases();
  const settings = useSettings();
  const { session } = useAuth();
  const userEmail = session?.user?.email ?? "";
  const shopName = settings?.shopName || "My Shop";
  const shopAddress = settings?.address || "";
  const shopPhone = settings?.phone || "";

  const accounts = useActiveAccounts();
  const balances = useAccountBalances();
  const accountsTree = useMemo(() => flattenAccountsGroupedByType(accounts), [accounts]);
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.type === "cash" && a.isDefault)?.id
      ?? accounts.find((a) => a.type === "cash")?.id
      ?? accounts[0]?.id
      ?? "",
    [accounts]
  );

  const { data: initData } = useQuery({
    queryKey: ["pos:init", "all"],
    queryFn: async () => { const res = await fetch("/api/pos/init"); return res.json(); },
    staleTime: 5 * 60 * 1000,
  });
  const warehouses = (initData?.warehouses || []) as any[];

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // UI State
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("All");

  const {
    searchTerm,
    setSearchTerm,
    results: searchResults,
    isSearching,
  } = useSearchHandler({
    mode: "client",
    data: allPurchases,
    customFilter: (po, q) => {
      const p = po as any;
      const poNum = p.poNumber ?? p.invoiceNo ?? "";
      const supName = p.supplierName ?? p.supplier?.name ?? "";
      const itemNames = (p.items ?? []).map((i: any) => i.name ?? "").join(" ");
      return poNum.toLowerCase().includes(q)
        || supName.toLowerCase().includes(q)
        || itemNames.toLowerCase().includes(q);
    },
  });

  const filtered = useMemo(
    () => (statusFilter === "All" ? searchResults : searchResults.filter((p: any) => p.status === statusFilter)),
    [searchResults, statusFilter],
  );

  const detail = useMemo(() => allPurchases.find((p) => p.id === detailId) ?? null, [allPurchases, detailId]);
  const receipt = useMemo(() => allPurchases.find((p) => p.id === receiptId) ?? null, [allPurchases, receiptId]);

  // URL Params auto-open logic
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const initialProductId = searchParams.get("createPO");
  const initialQty = Math.max(1, Number(searchParams.get("qty")) || 1);
  const initialSupplierId = searchParams.get("supplier") || undefined;

  useEffect(() => {
    if (initialProductId) {
      const product = products.find((p) => p.id === initialProductId);
      if (product) {
        setOpen(true);
      }
      const next = new URLSearchParams(searchParams.toString());
      next.delete("createPO");
      next.delete("qty");
      next.delete("supplier");
      router.replace(`${pathname}?${next.toString()}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        description="Supplier থেকে stock যোগ করুন — প্রতিটা unit barcode/serial scan করে ইউনিক ভাবে ট্র্যাক হবে।"
      />

      <PurchaseList
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filtered={filtered}
        isSearching={isSearching}
        onNew={() => { setEditId(null); setOpen(true); }}
        onView={(id) => setDetailId(id)}
        onEdit={(id) => { setEditId(id); setOpen(true); }}
        onPrint={(id) => setReceiptId(id)}
        onDelete={(id) => deletePurchase(id)}
      />

      <PurchaseFormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditId(null);
        }}
        editId={editId}
        onSuccess={(id) => {
          setOpen(false);
          setEditId(null);
          if (id) setReceiptId(id);
        }}
        products={products}
        suppliers={suppliers}
        accounts={accounts}
        accountsTree={accountsTree}
        balances={balances}
        defaultAccountId={defaultAccountId}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        setSelectedWarehouseId={setSelectedWarehouseId}
        initialProductId={initialProductId || undefined}
        initialQty={initialQty}
        initialSupplierId={initialSupplierId}
      />

      <PurchaseDetailSheet
        detail={detail}
        onClose={() => setDetailId(null)}
        accounts={accounts}
        accountsTree={accountsTree}
        balances={balances}
        defaultAccountId={defaultAccountId}
        onPrint={(id) => setReceiptId(id)}
      />

      <PurchaseInvoiceDialog
        receipt={receipt}
        onClose={() => setReceiptId(null)}
        suppliers={suppliers}
        shopName={shopName}
        shopAddress={shopAddress}
        shopPhone={shopPhone}
        userEmail={userEmail}
        settings={settings}
      />
    </div>
  );
}
