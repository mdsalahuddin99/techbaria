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
} from "lucide-react";
import type { UserRole } from "@/features/auth/types";
import { cn } from "@/shared/lib/utils";
import { signOut } from "next-auth/react";
import { useGlobalBarcodeScanner } from "@/shared/hooks/use-global-barcode-scanner";
import OfflineIndicator from "@/components/OfflineIndicator";
import { AdminWatchers } from "./AdminWatchers";
import BrandLogo from "@/components/BrandLogo";
import { Breadcrumb } from "@/shared/components";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useT, useLocale, LanguageToggle, type TranslationKey } from "@/features/i18n";
import { useSettings } from "@/features/settings/hooks";
import { CommandPalette } from "@/components/layout/CommandPalette";

type NavItem = { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard; roles?: UserRole[] };
type NavGroup = { labelKey: TranslationKey; icon: typeof LayoutDashboard; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.group.main" as TranslationKey,
    icon: LayoutDashboard,
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { to: "/dashboard/sales/create", labelKey: "nav.pos", icon: ScanBarcode },
    ],
  },
  {
    labelKey: "nav.group.catalog" as TranslationKey,
    icon: Package,
    items: [
      { to: "/dashboard/products", labelKey: "nav.products", icon: Package },
      { to: "/dashboard/categories", labelKey: "nav.categories", icon: FolderTree },
    ],
  },
  {
    labelKey: "nav.group.inventory" as TranslationKey,
    icon: Boxes,
    items: [
      { to: "/dashboard/inventory", labelKey: "nav.inventory", icon: Boxes },
      { to: "/dashboard/inventory/transfers", labelKey: "nav.transfers", icon: ArrowLeftRight },
      { to: "/dashboard/inventory/restock", labelKey: "nav.restock", icon: PackagePlus },
      { to: "/dashboard/inventory/audit", labelKey: "nav.audit", icon: ClipboardCheck },
    ],
  },
  {
    labelKey: "nav.group.commerce" as TranslationKey,
    icon: ShoppingCart,
    items: [
      { to: "/dashboard/sales", labelKey: "nav.sales", icon: ShoppingCart },
      { to: "/dashboard/returns", labelKey: "nav.returns", icon: Undo2 },
      { to: "/dashboard/purchases", labelKey: "nav.purchases", icon: Truck },
      { to: "/dashboard/warranty-lookup", labelKey: "nav.warrantyLookup" as TranslationKey, icon: ShieldCheck },
      { to: "/dashboard/warranty-claims", labelKey: "nav.warrantyClaims" as TranslationKey, icon: ShieldAlert },
    ],
  },
  {
    labelKey: "nav.group.ecommerce" as TranslationKey,
    icon: ShoppingBag,
    items: [
      { to: "/dashboard/online-orders", labelKey: "nav.onlineOrders", icon: ShoppingBag },
      { to: "/dashboard/online-orders/customers", labelKey: "nav.storefrontCustomers", icon: Users },
      { to: "/dashboard/storefront-settings", labelKey: "nav.storefrontSettings" as TranslationKey, icon: LayoutTemplate },
    ],
  },
  {
    labelKey: "nav.group.people" as TranslationKey,
    icon: Users,
    items: [
      { to: "/dashboard/customers", labelKey: "nav.customers", icon: Users },
      { to: "/dashboard/suppliers", labelKey: "nav.suppliers", icon: Receipt },
    ],
  },
  {
    labelKey: "nav.group.finance" as TranslationKey,
    icon: Banknote,
    items: [
      { to: "/dashboard/accounts", labelKey: "nav.accounts", icon: Wallet },
      { to: "/dashboard/expenses", labelKey: "nav.expenses", icon: Banknote },
      { to: "/dashboard/reports", labelKey: "nav.reports", icon: BarChart3 },
    ],
  },
  {
    labelKey: "nav.group.system" as TranslationKey,
    icon: Settings,
    items: [
      { to: "/dashboard/settings", labelKey: "nav.settings", icon: Settings },
      { to: "/dashboard/stock-audit", labelKey: "nav.stockAudit" as TranslationKey, icon: ShieldCheck },
    ],
  },
];

function getThemeClass(pathname: string) {
  if (pathname.includes("/dashboard/products") || pathname.includes("/dashboard/categories")) {
    return "theme-catalog";
  }
  if (pathname.includes("/dashboard/inventory")) {
    return "theme-inventory";
  }
  if (
    pathname.includes("/dashboard/sales") ||
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
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
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

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the group that contains the active route
  useEffect(() => {
    const activeGroup = navGroups.find((group) =>
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
    setExpandedGroups((prev) => {
      const isAlreadyExpanded = !!prev[groupKey];
      if (isAlreadyExpanded) {
        return {};
      }
      return {
        [groupKey]: true,
      };
    });
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
          {navGroups.map((group) => {
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
          {/* Global command bar — desktop */}
          <div className="hidden lg:flex flex-1 max-w-md">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("cmd:open-palette"));
              }}
              className="group w-full inline-flex items-center gap-2.5 px-3.5 h-9 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/70 hover:border-border text-sm text-muted-foreground transition"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">Search products, customers, orders…</span>
              <kbd className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/80">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
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
          <div className="print:hidden">
            <Breadcrumb />
          </div>
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
