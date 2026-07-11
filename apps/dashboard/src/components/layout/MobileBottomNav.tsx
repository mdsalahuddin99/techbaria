"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ScanBarcode,
  Boxes,
  Receipt,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  FolderTree,
  PackagePlus,
  Undo2,
  Users,
  ShoppingCart,
  Truck,
  Wallet,
  Banknote,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

type Item = { to: string; label: string; icon: typeof Boxes };

const PRIMARY: Item[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/dashboard/sales/create", label: "POS", icon: ScanBarcode },
  { to: "/dashboard/inventory", label: "Stock", icon: Boxes },
  { to: "/dashboard/sales", label: "Sales", icon: Receipt },
];

const MORE_GROUPS: Array<{ label: string; items: Item[] }> = [
  {
    label: "Catalog",
    items: [
      { to: "/dashboard/products", label: "Products", icon: Package },
      { to: "/dashboard/categories", label: "Categories", icon: FolderTree },
      { to: "/dashboard/inventory/restock", label: "Restock Orders", icon: PackagePlus },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/dashboard/returns", label: "Returns", icon: Undo2 },
      { to: "/dashboard/warranty-lookup", label: "Warranty Lookup", icon: ShieldCheck },
      { to: "/dashboard/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/dashboard/purchases", label: "Purchases", icon: ShoppingCart },
      { to: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
      { to: "/dashboard/expenses", label: "Expenses", icon: Wallet },
      { to: "/dashboard/accounts", label: "Accounts", icon: Banknote },
      { to: "/dashboard/dues", label: "Dues", icon: Wallet },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { to: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const MORE_PATHS = new Set(MORE_GROUPS.flatMap((g) => g.items.map((i) => i.to)));

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = MORE_PATHS.has(pathname);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border pb-safe shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.12)]"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 h-16">
        {PRIMARY.map((item) => {
          const isActive = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                href={item.to}
                className={cn(
                  "relative h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-95 active:bg-accent/40",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary" />
                )}
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative w-full h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-95 active:bg-accent/40",
                  inMore ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="More menu"
              >
                {inMore && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary" />
                )}
                <MoreHorizontal className={cn("h-5 w-5 transition-transform", inMore && "scale-110")} />
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-safe">
              <SheetHeader>
                <SheetTitle>All sections</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                {MORE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 pb-2">
                      {group.label}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map((item) => {
                        const isActive = pathname === item.to;
                        return (
                          <Link
                            key={item.to}
                            href={item.to}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-card text-center transition-colors",
                              isActive
                                ? "border-primary/50 bg-primary/5 text-primary"
                                : "border-border hover:bg-secondary"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs font-medium leading-tight">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
