"use client";

import { useMemo } from "react";
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
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/50 bg-white/40">
      <div className="flex items-center gap-3.5">
        <div className={cn("h-9 w-9 rounded-xl grid place-items-center shadow-sm", iconBg)}>
          <Icon className={cn("h-4.5 w-4.5", iconColor)} />
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
  usePageTitle("Dashboard");

  // Fetch real, aggregated metrics from the new backend service
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetricsQuery();
  
  // We still need the latest sales for the recent invoices table
  const { data: salesData } = useSalesQuery();
  const sales = (salesData?.items ?? []) as Sale[];
  const recent = sales.slice(0, 8);

  // We still need products to find low stock items (or we can just show the metric)
  // For the reorder queue, we use the prefetched products list
  const { data: productsData } = useProductsQuery();
  const products = (productsData?.items ?? []) as Product[];
  const lowStockProducts = products.filter(
    (p) => p.active && p.type !== "bundle" && p.stock <= effectiveReorderPoint(p)
  ).slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (isMetricsLoading || !metrics) {
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
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:px-6 sm:py-4 shadow-xl">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className="absolute -top-12 -right-12 h-32 w-32 bg-indigo-500/30 blur-[40px] rounded-full" />
        
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const a = accentMap[kpi.accent];
          return (
            <div
              key={kpi.id}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group",
                a.bg
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                <kpi.icon className="h-16 w-16 text-white" />
              </div>
              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className={cn("h-11 w-11 rounded-xl grid place-items-center backdrop-blur-md shadow-inner", a.iconBg)}>
                  <kpi.icon className="h-5.5 w-5.5" />
                </div>
                {kpi.delta !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm",
                      kpi.delta >= 0
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-red-500/20 text-white border border-red-500/30",
                    )}
                  >
                    {kpi.delta >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {kpi.delta >= 0 ? "+" : ""}{kpi.delta.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="relative z-10 text-[11px] font-extrabold uppercase tracking-widest text-white/80 mb-1">
                {kpi.label}
              </p>
              <p className="relative z-10 text-3xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-md">
                {kpi.value}
              </p>
              <p className="relative z-10 text-xs text-white/90 mt-2 font-medium bg-black/10 inline-block px-2.5 py-1 rounded-lg backdrop-blur-sm">
                {kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      <StorefrontBlock />

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly revenue bar chart */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col">
          <SectionHeader
            icon={BarChart3}
            title="Revenue Overview"
            subtitle="Last 6 months trajectory"
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
          />
          <div className="flex-1 p-5">
            {metrics.monthlyChart.every((m) => m.total === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium text-slate-500">Awaiting sales data</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthlyChart} margin={{ left: 0, right: 0, top: 10, bottom: 0 }} barSize={36}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      fontSize={12}
                      fontWeight={500}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="total" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Stock distribution donut */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col">
          <SectionHeader
            icon={Package}
            title="Inventory Health"
            subtitle="Current stock status"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            href="/dashboard/inventory"
            linkLabel="Inventory"
          />
          <div className="flex-1 p-5 flex flex-col justify-center">
            {metrics.stock.total === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Package className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium text-slate-500">No products found</p>
              </div>
            ) : (
              <>
                <div className="h-48 relative mb-4">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-extrabold text-slate-800">{metrics.stock.total}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Items</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.stockDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {metrics.stockDonut.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white backdrop-blur-md border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                              <div>
                                <p className="font-bold text-slate-800">{d.name}</p>
                                <p className="text-slate-500 font-medium">{d.value} SKUs</p>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-2.5 px-2">
                  {metrics.stockDonut.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ background: d.color }} />
                        <span className="text-slate-700 font-semibold">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums bg-white px-2 py-0.5 rounded shadow-sm">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent invoices + Top products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent invoices table */}
        <div className="lg:col-span-3 bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
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
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 m-4 rounded-xl border border-dashed border-slate-200">
              <Receipt className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-bold text-slate-600">No invoices yet</p>
              <p className="text-xs mt-1 text-slate-500">Create your first sale to see it here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Invoice</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Customer</th>
                    <th className="hidden md:table-cell text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Date</th>
                    <th className="text-center px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr
                      key={s.id}
                      className="bg-white hover:bg-slate-50 transition-colors group shadow-sm rounded-xl overflow-hidden"
                    >
                      <td className="px-4 py-3.5 rounded-l-xl border-y border-l border-slate-100">
                        <span className="font-bold text-indigo-600 text-xs tracking-tight bg-indigo-50 px-2 py-1 rounded-md">
                          #{s.invoiceNo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-y border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 grid place-items-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                            {(s.customerName || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-700 text-sm font-bold truncate max-w-[140px]">
                            {s.customerName || "Walk-in"}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3.5 border-y border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-50 w-fit px-2.5 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(s.date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center border-y border-slate-100">
                        <StatusBadge
                          method={s.paymentMethod}
                          total={s.total}
                          paid={s.amountPaid}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right rounded-r-xl border-y border-r border-slate-100">
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

        {/* Top products + Reorder queue */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Top selling products */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex-1">
            <SectionHeader
              icon={BarChart3}
              title="Trending Items"
              subtitle="Top sellers (30 Days)"
              iconBg="bg-orange-500/10"
              iconColor="text-orange-600"
            />
            {metrics.topProducts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 m-4 rounded-xl border border-dashed border-slate-200">
                <Package className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-xs font-semibold">No sales data yet</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {metrics.topProducts.map((p, i) => {
                  const maxQty = metrics.topProducts[0].qty;
                  const pct = Math.max(12, (p.qty / Math.max(1, maxQty)) * 100);
                  return (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 font-extrabold flex items-center justify-center text-sm shadow-inner group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-700 transition-colors">
                            {p.name}
                          </span>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums ml-2 shrink-0">
                            {p.qty} sold
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reorder queue */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
            <SectionHeader
              icon={AlertTriangle}
              title="Restock Alerts"
              subtitle={`${metrics.stock.low} items need attention`}
              href="/dashboard/restock-orders"
              linkLabel="Restock"
              iconBg="bg-red-500/10"
              iconColor="text-red-600"
            />
            {lowStockProducts.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 m-4 rounded-xl border border-dashed border-slate-200">
                <div className="h-12 w-12 rounded-full bg-emerald-50 grid place-items-center mb-3">
                  <Sparkles className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-700">Inventory looks great</p>
                <p className="text-xs text-slate-500 mt-1">No items currently need restocking.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockProducts.map((p) => {
                  const reorder = effectiveReorderPoint(p);
                  const suggested = suggestedPoQty(p);
                  const ratio = Math.min(1, p.stock / Math.max(1, reorder));
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 grid place-items-center text-xl shrink-0 shadow-sm border border-amber-100">
                        {p.emoji || "📦"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate mb-1">
                          {productDisplayName(p)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                ratio <= 0 ? "bg-red-500" : ratio < 0.5 ? "bg-orange-500" : "bg-amber-400",
                              )}
                              style={{ width: `${Math.max(8, ratio * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                            {p.stock} / {reorder}
                          </span>
                        </div>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="h-8 px-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shrink-0 shadow-md"
                      >
                        <Link
                          href={`/dashboard/purchases?createPO=${p.id}&qty=${suggested}${p.supplierId ? `&supplier=${p.supplierId}` : ""}`}
                        >
                          Order
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
