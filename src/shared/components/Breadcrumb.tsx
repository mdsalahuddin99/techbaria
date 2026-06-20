"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { memo, useMemo } from "react";

// ─── Segment → Label mapping ───────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "POS",
  products: "Products",
  "products-add": "Add Product",
  categories: "Categories",
  inventory: "Inventory",
  transfers: "Transfers",
  restock: "Restock",
  audit: "Audit",
  sales: "Sales",
  "sales-history": "Sales History",
  returns: "Returns",
  purchases: "Purchases",
  "online-orders": "Online Orders",
  customers: "Customers",
  suppliers: "Suppliers",
  accounts: "Accounts",
  expenses: "Expenses",
  reports: "Reports",
  settings: "Settings",
  notifications: "Notifications",
  "shop-setup": "Shop Setup",
  "stock-audit": "Stock Audit",
  "restock-orders": "Restock Orders",
  "warranty-lookup": "Warranty Lookup",
  dues: "Dues",
  billing: "Billing",
};

function segmentToLabel(segment: string): string {
  const key = segment.toLowerCase().replace(/-/g, "");
  if (SEGMENT_LABELS[key]) return SEGMENT_LABELS[key];
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // Fallback: capitalise & replace hyphens
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUuidOrId(segment: string): boolean {
  return /^[0-9a-f]{8,}$/i.test(segment) || segment.length > 16;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const Breadcrumb = memo(function Breadcrumb() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    // Only show breadcrumbs for dashboard routes
    if (!pathname.startsWith("/dashboard")) return [];

    const segments = pathname.split("/").filter(Boolean);
    const parts: Array<{ label: string; href: string; isLast: boolean }> = [];

    // Build cumulative path
    let accumulated = "";
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulated += "/" + seg;

      // Skip UUID-like segments (product IDs, etc.)
      if (isUuidOrId(seg)) continue;

      const isLast = i === segments.length - 1;
      let label = segmentToLabel(seg);

      // For action routes like /dashboard/products/add → "Add"
      // But we already handle this via segmentToLabel with the combined key
      if (
        !isLast &&
        i + 1 < segments.length &&
        SEGMENT_LABELS[segments[i + 1]?.toLowerCase().replace(/-/g, "")]
      ) {
        // If next segment is an action (add/edit), don't duplicate
      }

      // "Home" for first segment
      if (i === 0 && seg === "dashboard") {
        label = "Home";
      }

      parts.push({ label, href: accumulated, isLast });
    }

    return parts;
  }, [pathname]);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-2 -mt-1">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {crumbs.map((crumb, idx) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {idx > 0 && (
              <span className="text-muted-foreground/40 select-none">/</span>
            )}
            {crumb.isLast ? (
              <span className="font-medium text-foreground/80 truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors truncate max-w-[160px]"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
});
