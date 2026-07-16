"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useSalesQuery } from "@/features/sales/hooks";
import { useProductsQuery } from "@/features/products/hooks";
import { useDashboardMetricsQuery } from "@/features/dashboard/hooks";
import { Button } from "@/shared/ui/button";
import { formatCurrency, formatDateTime, productDisplayName } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { Sale, Product } from "@/shared/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Users,
  ShoppingCart,
  Package,
  ArrowUpRight,
  Receipt,
  Sparkles,
  BarChart3,
  CircleDot,
  ScanBarcode,
  ChevronRight,
  Clock,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import { effectiveReorderPoint, suggestedPoQty } from "@/features/products/bundle";
import dynamic from "next/dynamic";
const StorefrontBlock = dynamic(() => import("@/components/dashboard/StorefrontBlock"), { ssr: false });

// ─── Custom tooltip for charts ───────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-xl shadow-xl px-4 py-3 text-xs">
      {label && <p className="text-slate-500 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-slate-800 text-sm">
          {currency ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ method, total, paid }: { method: string; total: number; paid: number }) {
  const due = total - paid;
  if (due <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">
        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
      </span>
    );
  }
  if (method === "Due") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm">
        <Hourglass className="h-3.5 w-3.5" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-sm">
      <CircleDot className="h-3.5 w-3.5" /> {method}
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  href,
  linkLabel,
  iconBg,
  iconColor,
}: {
  icon: typeof BarChart3;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100/50 bg-white/40">
      <div className="flex items-center gap-3">
        <div className={cn("h-7 w-7 rounded-lg grid place-items-center shadow-sm", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-slate-100/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
        >
          {linkLabel ?? "View all"} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Main dashboard UI (client component) ────────────────────────────────────

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  usePageTitle("Dashboard");

  // Fetch real, aggregated metrics from the new backend service
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetricsQuery();
  
  // We still need the latest sales for the recent invoices table
  const { data: salesData } = useSalesQuery();
  const sales = (salesData?.items ?? []) as Sale[];
  const recent = sales.slice(0, 5);

  // We still need products to find low stock items (or we can just show the metric)
  // For the reorder queue, we use the prefetched products list
  const { data: productsData } = useProductsQuery();
  const products = (productsData?.items ?? []) as Product[];
  const lowStockProducts = products.filter(
    (p) => p.active && p.type !== "bundle" && p.stock <= effectiveReorderPoint(p)
  ).slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!mounted || isMetricsLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── KPI cards config ──
  const kpis = [
    {
      id: "revenue",
      label: "Total Revenue",
      value: formatCurrency(metrics.revenue.total),
      sub: `${formatCurrency(metrics.revenue.today)} today`,
      delta: metrics.revenue.delta,
      icon: Wallet,
      accent: "blue",
    },
    {
      id: "orders",
      label: "Total Orders",
      value: metrics.orders.total.toLocaleString(),
      sub: `${metrics.orders.today} orders today`,
      delta: null,
      icon: ShoppingCart,
      accent: "indigo",
    },
    {
      id: "stock",
      label: "Low Stock Alerts",
      value: metrics.stock.low.toString(),
      sub: metrics.stock.low > 0 ? "Items need reorder" : "All levels healthy",
      delta: null,
      icon: AlertTriangle,
      accent: metrics.stock.low > 0 ? "amber" : "emerald",
    },
    {
      id: "customers",
      label: "Customers",
      value: metrics.customers.total.toLocaleString(),
      sub: `${metrics.customers.vip} VIP member${metrics.customers.vip !== 1 ? "s" : ""}`,
      delta: null,
      icon: Users,
      accent: "violet",
    },
  ] as const;

  const accentMap = {
    blue:    { bg: "from-blue-500 to-cyan-500", iconBg: "bg-white/20 text-white", text: "text-white" },
    indigo:  { bg: "from-indigo-500 to-purple-500", iconBg: "bg-white/20 text-white", text: "text-white" },
    amber:   { bg: "from-amber-400 to-orange-500", iconBg: "bg-white/20 text-white", text: "text-white" },
    emerald: { bg: "from-emerald-400 to-teal-500", iconBg: "bg-white/20 text-white", text: "text-white" },
    violet:  { bg: "from-violet-500 to-fuchsia-500", iconBg: "bg-white/20 text-white", text: "text-white" },
  } as const;

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3 sm:px-5 sm:py-3 shadow-xl">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className="absolute -top-12 -right-12 h-32 w-32 bg-indigo-500/30 blur-[40px] rounded-full" />
        
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {greeting}, Mizan <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_infinite]">👋</span>
            </h1>
            <div className="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white/95 hover:bg-white border-white/20 shadow-lg hover:shadow-xl transition-all">
              <Link href="/dashboard/products">
                <Package className="h-3.5 w-3.5 mr-1.5 text-indigo-600" /> Products
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] border-none transition-all">
              <Link href="/dashboard/sales/create">
                <ScanBarcode className="h-3.5 w-3.5 mr-1.5" /> New Invoice
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI metric cards ── */}
      <div className="flex flex-wrap justify-center lg:justify-between gap-3">
        {kpis.map((kpi, idx) => {
          const a = accentMap[kpi.accent];
          return (
            <div
              key={kpi.id}
              className={cn(
                "relative overflow-hidden rounded-xl bg-gradient-to-br px-4 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group w-full sm:w-[calc(50%-6px)] lg:w-fit lg:min-w-[200px]",
                a.bg
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="absolute top-0 right-0 p-2.5 opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                <kpi.icon className="h-10 w-10 text-white" />
              </div>
              <div className="relative z-10 flex items-start justify-between mb-1">
                <div className={cn("h-5 w-5 rounded grid place-items-center backdrop-blur-md shadow-inner", a.iconBg)}>
                  <kpi.icon className="h-3 w-3" />
                </div>
                {kpi.delta !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1 rounded-full backdrop-blur-md shadow-sm",
                      kpi.delta >= 0
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-red-500/20 text-white border border-red-500/30",
                    )}
                  >
                    {kpi.delta >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {kpi.delta >= 0 ? "+" : ""}{kpi.delta.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="relative z-10 text-[9px] font-extrabold uppercase tracking-widest text-white/80 mt-1 mb-0">
                {kpi.label}
              </p>
              <p className="relative z-10 text-lg font-extrabold text-white tracking-tight tabular-nums drop-shadow-sm leading-none mt-0.5">
                {kpi.value}
              </p>
              <p className="relative z-10 text-[8.5px] text-white/90 mt-1 font-medium bg-black/10 inline-block px-1.5 py-0.5 rounded backdrop-blur-sm">
                {kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      <StorefrontBlock />

      {/* ── Main Content Rows ── */}
      <div className="grid grid-cols-1 gap-3 items-start">
        <div className="space-y-3 flex flex-col">
          {/* Recent invoices table */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
          <SectionHeader
            icon={Receipt}
            title="Recent Transactions"
            subtitle="Latest POS & Online sales"
            href="/dashboard/sales"
            linkLabel="All Sales"
            iconBg="bg-green-500/10"
            iconColor="text-green-600"
          />
          {recent.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 m-3 rounded-xl border border-dashed border-slate-200">
              <Receipt className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm font-bold text-slate-600">No invoices yet</p>
              <p className="text-xs mt-1 text-slate-500">Create your first sale to see it here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Invoice</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Customer</th>
                    <th className="hidden md:table-cell text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Date</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr
                      key={s.id}
                      className="bg-white hover:bg-slate-50 transition-colors group shadow-sm rounded-xl overflow-hidden"
                    >
                      <td className="px-3 py-2 rounded-l-xl border-y border-l border-slate-100">
                        <span className="font-bold text-indigo-600 text-xs tracking-tight bg-indigo-50 px-2 py-1 rounded-md">
                          #{s.invoiceNo}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-y border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 grid place-items-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                            {(s.customerName || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-700 text-sm font-bold truncate max-w-[140px]">
                            {s.customerName || "Walk-in"}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 border-y border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold bg-slate-50 w-fit px-2 py-1 rounded-md">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(s.date)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center border-y border-slate-100">
                        <StatusBadge
                          method={s.paymentMethod}
                          total={s.total}
                          paid={s.amountPaid}
                        />
                      </td>
                      <td className="px-3 py-2 text-right rounded-r-xl border-y border-r border-slate-100">
                        <span className="font-extrabold text-slate-800 tabular-nums text-sm">
                          {formatCurrency(s.total)}
                        </span>
                        {s.total > s.amountPaid && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-1">
                            Due: {formatCurrency(s.total - s.amountPaid)}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      </div>

    </div>
  );
}
