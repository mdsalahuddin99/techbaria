"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Users,
  Truck,
  Receipt,
  Wallet,
  BarChart3,
  Banknote,
  Settings,
  Bell,
  PackagePlus,
  ArrowLeftRight,
  ClipboardCheck,
  Undo2,
  ShieldCheck,
  ShoppingBag,
  Search,
  PanelLeftOpen,
  Command,
  LogOut,
  ChevronDown,
  ChevronRight,
  LayoutTemplate,
  ShieldAlert,
  FileText,
  UserPlus,
  List,
  RefreshCw,
  Plus,
} from "lucide-react";
import type { UserRole } from "@/features/auth/types";
import { cn } from "@/shared/lib/utils";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { useGlobalBarcodeScanner } from "@/shared/hooks/use-global-barcode-scanner";
import OfflineIndicator from "@/components/OfflineIndicator";
import { AdminWatchers } from "./AdminWatchers";
import BrandLogo from "@/components/BrandLogo";
import { Breadcrumb } from "@/shared/components";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useT, useLocale, LanguageToggle, type TranslationKey } from "@/features/i18n";
import { useSettings } from "@/features/settings/hooks";
import { CommandPalette } from "@/components/layout/CommandPalette";

type NavItem = { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard; roles?: UserRole[]; permissions?: string[] };
type NavGroup = { labelKey: TranslationKey; icon: typeof LayoutDashboard; items: NavItem[]; permissions?: string[] };

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.group.main" as TranslationKey,
    icon: LayoutDashboard,
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
    ],
  },
  {
    labelKey: "nav.customers" as TranslationKey,
    icon: Users,
    permissions: ["PEOPLE"],
    items: [
      { to: "/dashboard/customers?action=new", labelKey: "nav.newCustomer" as TranslationKey, icon: UserPlus },
      { to: "/dashboard/customers", labelKey: "nav.customerList" as TranslationKey, icon: Users },
    ],
  },
  {
    labelKey: "nav.group.sales" as TranslationKey,
    icon: ShoppingCart,
    permissions: ["POS"],
    items: [
      { to: "/dashboard/sales/create", labelKey: "nav.pos", icon: ScanBarcode },
      { to: "/dashboard/sales", labelKey: "nav.sales", icon: ShoppingCart },
      { to: "/dashboard/quotations", labelKey: "nav.quotations", icon: FileText },
      { to: "/dashboard/returns", labelKey: "nav.returns", icon: Undo2 },
      { to: "/dashboard/dues", labelKey: "nav.dues", icon: ClipboardCheck },
    ],
  },
  {
    labelKey: "nav.suppliers" as TranslationKey,
    icon: Receipt,
    permissions: ["PEOPLE"],
    items: [
      { to: "/dashboard/suppliers?action=new", labelKey: "nav.newSupplier" as TranslationKey, icon: UserPlus },
      { to: "/dashboard/suppliers", labelKey: "nav.supplierList" as TranslationKey, icon: Receipt },
    ],
  },
  {
    labelKey: "nav.group.purchases" as TranslationKey,
    icon: Truck,
    permissions: ["INVENTORY"],
    items: [
      { to: "/dashboard/purchases?action=new", labelKey: "nav.newPurchase" as TranslationKey, icon: PackagePlus },
      { to: "/dashboard/purchases", labelKey: "nav.purchaseHistory" as TranslationKey, icon: Truck },
    ],
  },
  {
    labelKey: "nav.products" as TranslationKey,
    icon: Package,
    permissions: ["INVENTORY", "POS"],
    items: [
      { to: "/dashboard/products?action=new", labelKey: "nav.newProduct" as TranslationKey, icon: PackagePlus },
      { to: "/dashboard/products", labelKey: "nav.productList" as TranslationKey, icon: Package },
    ],
  },
  {
    labelKey: "nav.categories" as TranslationKey,
    icon: FolderTree,
    permissions: ["INVENTORY", "POS"],
    items: [
      { to: "/dashboard/categories?action=new", labelKey: "nav.newCategory" as TranslationKey, icon: FolderTree },
      { to: "/dashboard/categories", labelKey: "nav.categories", icon: FolderTree },
      { to: "/dashboard/item-list?action=new", labelKey: "nav.newItemList" as TranslationKey, icon: Plus },
      { to: "/dashboard/item-list", labelKey: "nav.itemList", icon: List },
    ],
  },
  {
    labelKey: "nav.group.inventory" as TranslationKey,
    icon: Boxes,
    permissions: ["INVENTORY"],
    items: [
      { to: "/dashboard/inventory", labelKey: "nav.inventory", icon: Boxes },
      { to: "/dashboard/inventory/transfers", labelKey: "nav.transfers", icon: ArrowLeftRight },
      { to: "/dashboard/stock-audit", labelKey: "nav.stockAudit" as TranslationKey, icon: ShieldCheck },
    ],
  },
  {
    labelKey: "nav.group.warranty" as TranslationKey,
    icon: ShieldCheck,
    permissions: ["POS", "INVENTORY"],
    items: [
      { to: "/dashboard/warranty-lookup", labelKey: "nav.warrantyLookup" as TranslationKey, icon: ShieldCheck },
      { to: "/dashboard/warranty-claims", labelKey: "nav.warrantyClaims" as TranslationKey, icon: ShieldAlert },
    ],
  },
  {
    labelKey: "nav.group.ecommerce" as TranslationKey,
    icon: ShoppingBag,
    permissions: ["ECOMMERCE"],
    items: [
      { to: "/dashboard/online-orders", labelKey: "nav.onlineOrders", icon: ShoppingBag },
      { to: "/dashboard/online-categories", labelKey: "nav.onlineCategories" as TranslationKey, icon: FolderTree },
      { to: "/dashboard/menu-management", labelKey: "nav.menuManagement" as TranslationKey, icon: List },
      { to: "/dashboard/online-inventory", labelKey: "nav.inventory" as TranslationKey, icon: Boxes },
      { to: "/dashboard/storefront-settings", labelKey: "nav.storefrontSettings" as TranslationKey, icon: LayoutTemplate },
      { to: "/dashboard/online-orders/customers", labelKey: "nav.storefrontCustomers", icon: Users },
    ],
  },

  {
    labelKey: "nav.group.finance" as TranslationKey,
    icon: Banknote,
    permissions: ["FINANCE"],
    items: [
      { to: "/dashboard/accounts", labelKey: "nav.accounts", icon: Wallet },
      { to: "/dashboard/expenses", labelKey: "nav.expenses", icon: Banknote },
    ],
  },
  {
    labelKey: "nav.group.reports" as TranslationKey,
    icon: BarChart3,
    permissions: ["REPORTS"],
    items: [
      { to: "/dashboard/reports", labelKey: "nav.reports", icon: BarChart3 },
    ],
  },
  {
    labelKey: "nav.group.system" as TranslationKey,
    icon: Settings,
    permissions: ["SETTINGS"],
    items: [
      { to: "/dashboard/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

function getThemeClass(pathname: string) {
  if (pathname.includes("/dashboard/products") || pathname.includes("/dashboard/categories") || pathname.includes("/dashboard/item-list")) {
    return "theme-catalog";
  }
  if (pathname.includes("/dashboard/inventory")) {
    return "theme-inventory";
  }
  if (
    pathname.includes("/dashboard/sales") ||
    pathname.includes("/dashboard/quotations") ||
    pathname.includes("/dashboard/returns") ||
    pathname.includes("/dashboard/purchases") ||
    pathname.includes("/dashboard/warranty-lookup") ||
    pathname.includes("/dashboard/warranty-claims")
  ) {
    return "theme-commerce";
  }
  if (pathname.includes("/dashboard/online-orders")) {
    return "theme-ecommerce";
  }
  if (pathname.includes("/dashboard/customers") || pathname.includes("/dashboard/suppliers")) {
    return "theme-people";
  }
  if (
    pathname.includes("/dashboard/accounts") ||
    pathname.includes("/dashboard/expenses") ||
    pathname.includes("/dashboard/reports")
  ) {
    return "theme-finance";
  }
  if (pathname.includes("/dashboard/settings") || pathname.includes("/dashboard/stock-audit")) {
    return "theme-system";
  }
  return "theme-main";
}

// ─── Props from server layout ──────────────────────────────────────────────

export function AdminShell({
  children,
  userName,
  userEmail,
  userRole,
  userPermissions,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: "ADMIN" | "CASHIER" | "USER";
  userPermissions: string[];
}) {
  const pathname = usePathname();
  const t = useT();
  const locale = useLocale();
  const settings = useSettings();
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Debounced hover — avoid flicker when passing over the edge
  const handleMouseEnter = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 300);
  }, []);

  // Clean up timer
  useEffect(() => {
    return () => clearTimeout(hoverTimer.current);
  }, []);

  // Barcode scanner — only on POS page
  useGlobalBarcodeScanner();

  const filteredNavGroups = useMemo(() => {
    if (userRole === "ADMIN") return navGroups;
    return navGroups
      .map((group) => {
        if (group.permissions && !group.permissions.some((p) => userPermissions.includes(p))) {
          return null;
        }
        const filteredItems = group.items.filter((item) => {
          if (item.permissions && !item.permissions.some((p) => userPermissions.includes(p))) {
            return false;
          }
          return true;
        });
        if (filteredItems.length === 0) return null;
        return { ...group, items: filteredItems };
      })
      .filter(Boolean) as NavGroup[];
  }, [userRole, userPermissions]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the group that contains the active route
  useEffect(() => {
    const activeGroup = filteredNavGroups.find((group) =>
      group.items.some((item) => pathname === item.to || pathname.startsWith(item.to + "/"))
    );
    if (activeGroup) {
      setExpandedGroups({
        [activeGroup.labelKey]: true,
      });
    } else {
      setExpandedGroups({});
    }
  }, [pathname]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-background text-foreground antialiased print:block print:h-auto print:overflow-visible">
      {/* ─── Sidebar (desktop only) ────────────────────────────────────── */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 print:hidden",
          hovered ? "w-56" : "w-[58px]",
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 h-16 px-3 border-b border-sidebar-border shrink-0 min-w-0">
          <BrandLogo logoUrl={settings.logoUrl} shopName={settings.shopName} className="h-8 w-8 shrink-0" />
          {hovered && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-sidebar-foreground">
                {settings.shopName}
              </p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">
                {settings.tagline}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto px-2 py-3 no-scrollbar",
            hovered ? "space-y-1.5" : "space-y-2"
          )}
        >
          {filteredNavGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.labelKey];
            const isGroupActive = group.items.some(
              (item) => pathname === item.to || pathname.startsWith(item.to + "/")
            );

            if (hovered) {
              return (
                <div key={group.labelKey} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.labelKey)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 group/header",
                      isGroupActive && "text-primary bg-primary/5 font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <group.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isGroupActive
                            ? "text-primary"
                            : "text-sidebar-foreground/60 group-hover/header:text-sidebar-foreground"
                        )}
                      />
                      <span className="truncate">{t(group.labelKey)}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 group-hover/header:text-sidebar-foreground/70 transition-transform" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 group-hover/header:text-sidebar-foreground/70 transition-transform" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="pl-3.5 ml-4 border-l border-sidebar-border/40 space-y-0.5 transition-all">
                      {group.items.map((item) => {
                        const isActive = pathname === item.to || pathname.startsWith(item.to + "/");
                        return (
                          <Link
                            key={item.to}
                            href={item.to}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t(item.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              const firstItem = group.items[0];
              return (
                <Link
                  key={group.labelKey}
                  href={firstItem.to}
                  className={cn(
                    "flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition relative group/icon",
                    isGroupActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  title={t(group.labelKey)}
                >
                  <group.icon className="h-4 w-4 shrink-0" />
                </Link>
              );
            }
          })}
        </nav>

        {/* User card */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-sidebar-accent/30 group/user">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-[10px] font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {hovered && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-sidebar-foreground">
                    {userName}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">
                    {userEmail}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="h-7 w-7 rounded-lg grid place-items-center text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition shrink-0"
                  title="Log out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 print:block">
        <header className="h-14 border-b border-border/60 bg-card md:bg-card/80 md:backdrop-blur-xl md:sticky md:top-0 z-30 flex items-center justify-between gap-3 px-3 md:px-4 print:hidden">
          {/* Breadcrumb / Spacer */}
          <div className="flex-1 min-w-0 flex items-center">
            <div className="print:hidden truncate">
              <Breadcrumb />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Quick Add Icons - Desktop Only */}
            <div className="hidden lg:flex items-center gap-1 mr-1">
              <Link
                href="/dashboard/products?action=new"
                title="New Product"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <PackagePlus className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/purchases?action=new"
                title="New Purchase"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <ShoppingCart className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/customers?action=new"
                title="New Customer"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <UserPlus className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/suppliers?action=new"
                title="New Supplier"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <Truck className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/expenses?action=new"
                title="New Expense"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <Banknote className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/inventory"
                title="Inventory"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <Boxes className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/reports"
                title="Reports"
                className="grid place-items-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <BarChart3 className="h-4 w-4" />
              </Link>
              <div className="h-5 w-px bg-border/70 mx-1" />
            </div>

            <button
              onClick={async () => {
                const loadingToast = toast.loading("Clearing cache...");
                try {
                  const res = await fetch("/api/cache/clear", { method: "POST" });
                  if (res.ok) {
                    toast.success("Cache cleared! Reloading...", { id: loadingToast });
                    setTimeout(() => window.location.reload(), 1000);
                  } else {
                    toast.error("Failed to clear cache", { id: loadingToast });
                  }
                } catch (e) {
                  toast.error("Failed to clear cache", { id: loadingToast });
                }
              }}
              title="Clear Cache & Hard Reload"
              className="hidden sm:grid place-items-center h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <LanguageToggle iconOnly />
            <Link
              href="/dashboard/notifications"
              className="hidden sm:grid place-items-center h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Link>
            <div className="hidden sm:block h-6 w-px bg-border/70 mx-1" />
            <Link
              href="/dashboard/sales/create"
              className="inline-flex items-center gap-2 px-3 md:px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
            >
              <ScanBarcode className="h-4 w-4" />
              <span className="hidden sm:inline">{t("header.newSale")}</span>
            </Link>
          </div>
        </header>

        <main className={cn(
          "flex-1 px-2 md:px-3 py-2 md:py-3 overflow-y-auto overflow-x-hidden scroll-smooth pb-nav w-full print:p-0 print:overflow-visible print:block",
          getThemeClass(pathname)
        )}>
          {children}
        </main>
      </div>

      <div className="print:hidden">
        <MobileBottomNav />
      </div>
      <OfflineIndicator />
      <AdminWatchers />
      <CommandPalette />
    </div>
  );
}
