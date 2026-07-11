import { usePosStore } from "@/store/usePosStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/services";
import type { ShopSettings } from "@/features/settings/types";
import { apiFetch } from "@/shared/api-client/fetch";

/** Fetch all POS init data in a single request. */
export const posInitKeys = {
  all: ["pos", "init"] as const,
  byWarehouse: (warehouseId: string | null) => ["pos", "init", warehouseId] as const,
};

const fetchPosInit = (warehouseId?: string | null) => {
  const qs = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";
  return fetch(`/api/pos/init${qs}`).then((r) => {
    if (!r.ok) throw new Error("Failed to load POS data");
    return r.json() as Promise<{
      products: { items: any[]; nextCursor?: string; hasMore: boolean };
      customers: { items: any[]; nextCursor?: string; hasMore: boolean };
      accounts: any[];
      warehouses: any[];
      categories: any[];
      users: any[];
      settings: { shopName: string; currencySymbol: string };
    }>;
  });
};

export const posCoreKeys = {
  all: ["pos", "core"] as const,
};

const fetchPosCore = () => {
  // We can still use the same endpoint, but we don't care about products/customers.
  // Ideally this would be a lighter endpoint, but for now we reuse and ignore heavy arrays.
  // Actually, to make it lean, let's hit `/api/pos/init?coreOnly=true` if supported, or just use the same.
  // Since we don't have coreOnly yet, we'll just fetch init without a warehouseId and ignore products/customers,
  // or better, if the backend supports `coreOnly=true` we should use it. For now, it will fetch what it fetches.
  return fetch(`/api/pos/init?coreOnly=true`).then((r) => {
    if (!r.ok) throw new Error("Failed to load POS Core data");
    return r.json() as Promise<{
      accounts: any[];
      warehouses: any[];
      categories: any[];
      users: any[];
      settings: { shopName: string; currencySymbol: string };
      products?: any;
      customers?: any;
    }>;
  });
};

/** Reactive cart selectors — keep checkout latency at zero. */
export function useCart() {
  const cart = usePosStore((s) => s.cart);
  const discount = usePosStore((s) => s.discount);
  const selectedCustomerId = usePosStore((s) => s.selectedCustomerId);

  return { cart, discount, selectedCustomerId };
}

export function useHeldSales() {
  const queryClient = useQueryClient();
  const clearCart = usePosStore((s) => s.clearCart);
  const restoreCart = usePosStore((s) => s.restoreCart);

  const { data: heldSales = [], isLoading } = useQuery({
    queryKey: ["heldSales"],
    queryFn: () => apiFetch<any[]>("/api/pos/held-sales"),
  });

  const holdMutation = useMutation({
    mutationFn: (payload: { customerId?: string | null; customerName?: string; cart: any; discount: number }) =>
      apiFetch("/api/pos/held-sales", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heldSales"] });
      clearCart();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/pos/held-sales?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heldSales"] });
    },
  });

  const resumeSale = async (id: string) => {
    const sale = heldSales.find((h) => h.id === id);
    if (!sale) return;
    restoreCart({ cart: sale.cart, discount: sale.discount, selectedCustomerId: sale.customerId });
  };

  return {
    heldSales,
    isLoading,
    holdCurrentSale: holdMutation.mutateAsync,
    resumeHeldSale: resumeSale,
    deleteHeldSale: deleteMutation.mutateAsync,
    isHolding: holdMutation.isPending,
  };
}

export function useCartActions() {
  return {
    addToCart: usePosStore((s) => s.addToCart),
    setQty: usePosStore((s) => s.setQty),
    setCartItemWarranty: usePosStore((s) => s.setCartItemWarranty),
    setCartItemSerials: usePosStore((s) => s.setCartItemSerials),
    removeFromCart: usePosStore((s) => s.removeFromCart),
    clearCart: usePosStore((s) => s.clearCart),
    restoreCart: usePosStore((s) => s.restoreCart),
    setDiscount: usePosStore((s) => s.setDiscount),
    setSelectedCustomer: usePosStore((s) => s.setSelectedCustomer),
    /**
     * Service-backed checkout with full sale payload.
     * Returns the created Sale or throws a ServiceError.
     */
    checkout: (saleData: Record<string, unknown>) => salesService.create(saleData),
    /**
     * Service-backed update for edit mode.
     * Returns the updated Sale or throws.
     */
    updateSale: (saleId: string, saleData: Record<string, unknown>) =>
      salesService.update(saleId, saleData),
  };
}

/**
 * Aggregates the read-only data the invoice page needs (catalog, customers,
 * branches, shop settings) via a single /api/pos/init call.
 *
 * Pass `branchId` to get products filtered to that branch's BranchStock
 * (qty > 0). The query key includes branchId so React Query re-fetches
 * automatically whenever the selected branch changes.
 */
export function usePosScreenData(warehouseId?: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: warehouseId ? posInitKeys.byWarehouse(warehouseId) : posInitKeys.all,
    queryFn: () => fetchPosInit(warehouseId),
    staleTime: 60_000,       // 1 min cache — wallet balance kept fresh via invalidation on checkout
    gcTime: 5 * 60_000,      // 5 min in memory for instant back-navigation
    refetchOnWindowFocus: false, // tab switch এ refetch নয় — checkout invalidation যথেষ্ট
  });

  const products = (data?.products?.items ?? []) as any[];
  const customers = (Array.isArray(data?.customers) ? data?.customers : data?.customers?.items) ?? [];
  const warehouses = (data?.warehouses ?? []) as any[];
  const categories = (data?.categories ?? []) as any[];
  const users = (data?.users ?? []) as any[];
  const settings: ShopSettings = {
    shopName: data?.settings?.shopName ?? "AmarShop",
    address: "",
    phone: "",
    email: "",
    currencySymbol: data?.settings?.currencySymbol ?? "৳",
    receiptFooter: "",
    loyaltyEnabled: false,
    loyaltyPointsPerCurrency: 1,
    loyaltyRedeemRate: 1,
    paymentMethodsEnabled: { Cash: true, Card: true, "Mobile Banking": true, Due: true, Wallet: true },
  };
  return { products, customers, warehouses, categories, users, settings, isLoading };
}

/**
 * A leaner version of usePosScreenData that doesn't rely on products/customers being fetched upfront.
 */
export function usePosCoreData() {
  const { data, isLoading } = useQuery({
    queryKey: posCoreKeys.all,
    queryFn: () => fetchPosCore(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const warehouses = (data?.warehouses ?? []) as any[];
  const categories = (data?.categories ?? []) as any[];
  const users = (data?.users ?? []) as any[];
  const settings: ShopSettings = {
    shopName: data?.settings?.shopName ?? "AmarShop",
    address: "",
    phone: "",
    email: "",
    currencySymbol: data?.settings?.currencySymbol ?? "৳",
    receiptFooter: "",
    loyaltyEnabled: false,
    loyaltyPointsPerCurrency: 1,
    loyaltyRedeemRate: 1,
    paymentMethodsEnabled: { Cash: true, Card: true, "Mobile Banking": true, Due: true, Wallet: true },
  };
  return { warehouses, categories, users, settings, isLoading };
}

