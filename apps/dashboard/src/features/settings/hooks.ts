import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services";
import type { ShopSettings } from "@/features/settings/types";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";
import { toast } from "sonner";

// ─── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "AmarShop",
  tagline: "POS & Inventory",
  logoUrl: "",
  address: "123 Main Road, Dhaka",
  phone: "01711-000000",
  email: "shop@amarshop.bd",
  website: "",
  currencySymbol: "৳",
  receiptFooter: "",
  loyaltyEnabled: false,
  loyaltyPointsPerCurrency: 1,
  loyaltyRedeemRate: 1,
  paymentMethodsEnabled: { Cash: true, Card: true, "Mobile Banking": true, Due: true, Wallet: true },
  defaultReceiptMode: "ask",
  hapticFeedback: true,
  invoiceReturnPolicy: "",
  invoiceWarrantyNote: "",
  invoiceShowComputerGenerated: true,
  invoiceTitleLabel: "Sales Invoice",
  invoiceHeaderRightLogoUrl: "",
  invoiceFooterText: "",
  invoiceFooterBrandLogos: [],
  invoiceNumberPrefix: "STAN",
  invoiceNumberStartSeq: 500,
};


// ─── localStorage helpers (backward-compat & offline fallback) ──────────────

const LS_KEY = "techbaria-settings";

function loadLocal(): ShopSettings {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveLocal(settings: ShopSettings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export const SETTINGS_CHANGED_EVENT = "techbaria-settings-changed";

// ─── Query key ─────────────────────────────────────────────────────────────

const SETTINGS_KEY = ["shop", "settings"];

// ─── Hooks ─────────────────────────────────────────────────────────────────

/**
 * Read shop settings.
 *
 * Strategy:
 * 1. First render → return localStorage value (instant, no loading state).
 * 2. React Query fetches from API in background → updates on success.
 * 3. Refetches every 60s (staleTime) for multi-tab freshness.
 * 4. Listens to SETTINGS_CHANGED_EVENT for same-tab sync.
 */
export function useSettings(): ShopSettings {
  const queryClient = useQueryClient();
  let authSession: any = null;
  let authStatus = "unauthenticated";
  try {
    const auth = useAuth();
    authSession = auth?.session ?? null;
    authStatus = auth?.status ?? "unauthenticated";
  } catch {
    // useAuth not available outside AuthProvider
  }

  // Hydrate from localStorage instantly
  const [local, setLocal] = useState<ShopSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setLocal(loadLocal());
  }, []);

  // React Query fetch from API
  const { data: serverData } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => settingsService.get(),
    enabled: authStatus !== "loading" && !!authSession,
    ...QueryTier.REFERENCE,
  });

  // Manually sync to localStorage when query succeeds
  useEffect(() => {
    if (serverData) {
      saveLocal(serverData);
      setLocal(serverData);
    }
  }, [serverData]);

  // Re-read when another tab/component saves
  useEffect(() => {
    const handler = () => setLocal(loadLocal());
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  // Also invalidate on focus for multi-tab freshness
  useEffect(() => {
    const onFocus = () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [queryClient]);

  return serverData ?? local;
}

/**
 * Update shop settings — persists to DB + localStorage.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<ShopSettings>) => settingsService.update(input),
    onSuccess: (result: ShopSettings) => {
      // Sync to localStorage
      saveLocal(result);
      // Update React Query cache
      queryClient.setQueryData<ShopSettings>(SETTINGS_KEY, result);
      // Notify other components/tabs
      window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
      toast.success("Settings saved");
    },
    onError: (err: Error) => {
      console.error("[useUpdateSettings]", err.message);
    },
  });
}

/**
 * Specialised hook for the Settings page — gives you local-editable state
 * + save function. Loads from API, falls back to localStorage.
 */
export function useSettingsForm() {
  const settings = useSettings();
  const [form, setForm] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      setForm(settings);
      setLoaded(true);
    }
  }, [settings, loaded]);

  const updateMutation = useUpdateSettings();

  const save = useCallback(async () => {
    await updateMutation.mutateAsync(form);
  }, [form, updateMutation]);

  return {
    form,
    setForm,
    save,
    saving: updateMutation.isPending,
    loaded,
  };
}
