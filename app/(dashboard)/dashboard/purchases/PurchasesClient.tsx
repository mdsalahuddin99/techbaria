"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSuppliers } from "@/features/suppliers/hooks";
import { usePurchaseActions, useInfinitePurchasesQuery } from "@/features/purchases/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useAuth } from "@/features/auth";
import { useProductsQuery } from "@/features/products/hooks";
import { useActiveAccounts, useAccountBalances } from "@/features/accounts/hooks";
import { flattenAccountsGroupedByType } from "@/features/accounts/tree";
import { PageHeader } from "@/shared/components";
import type { PurchaseOrder } from "@/features/purchases/types";
import type { Supplier } from "@/features/suppliers/types";
import type { FinancialAccount, LedgerTransaction } from "@/features/accounts/types";
import type { Product } from "@/features/products/types";

import {
  PurchaseList,
  PurchaseFormDialog,
  PurchaseDetailSheet,
  PurchaseInvoiceDialog,
} from "@/features/purchases/components";

export function PurchasesClient({
  initialSuppliers,
  initialProducts,
  initialPurchases,
  initialAccounts,
  initialLedger,
}: {
  initialSuppliers: Supplier[];
  initialProducts: Product[];
  initialPurchases: PurchaseOrder[];
  initialAccounts: FinancialAccount[];
  initialLedger: LedgerTransaction[];
}) {
  usePageTitle("Purchases");
  const { data: suppliers } = useSuppliers(initialSuppliers);
  const products = (useProductsQuery(initialProducts).data?.items ?? []);
  const { delete: deletePurchase } = usePurchaseActions();
  const settings = useSettings();
  const { session } = useAuth();
  const userEmail = session?.user?.email ?? "";
  const shopName = settings?.shopName || "My Shop";
  const shopAddress = settings?.address || "";
  const shopPhone = settings?.phone || "";

  const accounts = useActiveAccounts(initialAccounts);
  const balances = useAccountBalances(initialAccounts, initialLedger);
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
  const warehouses = (initData?.warehouses || []);

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

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfinitePurchasesQuery({
    search: debouncedSearch,
    status: statusFilter,
  });

  const allPurchases = useMemo(() => {
    if (!data) return initialPurchases;
    return data.pages.flatMap((page) => page.items);
  }, [data, initialPurchases]);

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
      setOpen(true);
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
        filtered={allPurchases}
        isSearching={isLoading}
        onNew={() => { setEditId(null); setOpen(true); }}
        onView={(id) => setDetailId(id)}
        onEdit={(id) => { setEditId(id); setOpen(true); }}
        onPrint={(id) => setReceiptId(id)}
        onDelete={(id) => deletePurchase(id)}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
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
