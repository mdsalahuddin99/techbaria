"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useSalesQuery } from "@/features/sales/hooks";
import { useProductsQuery } from "@/features/products/hooks";
import { useCustomersQuery } from "@/features/customers/hooks";
import { Button } from "@/shared/ui/button";
import { formatCurrency, formatDateTime, productDisplayName } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
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
  XCircle,
  Hourglass,
} from "lucide-react";
import { effectiveReorderPoint, suggestedPoQty } from "@/features/products/bundle";
import StorefrontBlock from "@/components/dashboard/StorefrontBlock";

// ─── Custom tooltip for charts ───────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-slate-200/80 rounded-lg shadow-md px-3.5 py-2.5 text-xs">
      {label && <p className="text-slate-400 font-semibold mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-teal-800">
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
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  }
  if (method === "Due") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
        <Hourglass className="h-3 w-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
      <CircleDot className="h-3 w-3" /> {method}
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
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/40">
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-lg grid place-items-center border border-teal-100/40", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition"
        >
          {linkLabel ?? "View all"} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Main dashboard UI (client component) ────────────────────────────────────
// Data is pre-seeded into TanStack Query cache by the Server Component
// (page.tsx via HydrationBoundary), so the first render is instant —
// no loading spinner on the happy path.

export default function DashboardClient() {
  usePageTitle("Dashboard");

  // These hooks read from the pre-hydrated cache on first render,
  // so they never show a loading state on initial page load.
  const sales = ((useSalesQuery().data as any)?.items ?? []) as any[];
  const products = ((useProductsQuery().data as any)?.items ?? []) as any[];
  const customers = ((useCustomersQuery().data as any)?.items ?? []) as any[];

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const todaysSales = sales.filter((s) => new Date(s.date).toDateString() === today);
  const yestSales = sales.filter((s) => new Date(s.date).toDateString() === yesterday);
  const todayTotal = todaysSales.reduce((s, sale) => s + sale.total, 0);
  const yestTotal = yestSales.reduce((s, sale) => s + sale.total, 0);
  const todayDelta = yestTotal ? ((todayTotal - yestTotal) / yestTotal) * 100 : 0;
  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const lowStock = products.filter(
    (p) => p.active && p.type !== "bundle" && p.stock <= effectiveReorderPoint(p),
  );

  // ── Monthly bar chart (last 6 months) ──
  const monthlyChart = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    sales.forEach((s) => {
      const d = new Date(s.date);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      if (key in months) months[key] += s.total;
    });
    return Object.entries(months).map(([month, total]) => ({ month, total }));
  }, [sales]);

  // ── Donut: stock health distribution ──
  const stockDonut = useMemo(() => {
    const healthy = products.filter(
      (p) => p.active && p.type !== "bundle" && p.stock > effectiveReorderPoint(p),
    ).length;
    const low = lowStock.length;
    const outOf = products.filter((p) => p.active && p.type !== "bundle" && p.stock === 0).length;
    const rest = Math.max(0, products.length - healthy - low - outOf);
    return [
      { name: "Healthy", value: healthy, color: "#0f766e" },
      { name: "Low Stock", value: low, color: "#f59e0b" },
      { name: "Out of Stock", value: outOf, color: "#ef4444" },
      ...(rest > 0 ? [{ name: "Other", value: rest, color: "#ccfbf1" }] : []),
    ].filter((d) => d.value > 0);
  }, [products, lowStock]);

  // ── Top products ──
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number }> = {};
    sales.forEach((s) =>
      s.items.forEach((i: any) => {
        if (!counts[i.productId]) counts[i.productId] = { name: i.name, qty: 0 };
        counts[i.productId].qty += i.qty;
      }),
    );
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((p) => ({ ...p, name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name }));
  }, [sales]);

  const recent = sales.slice(0, 8);
  const totalOrders = sales.length;
  const vipCount = customers.filter((c) => c.group === "VIP").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // ── KPI cards config ──
  const kpis = [
    {
      id: "revenue",
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      sub: `${formatCurrency(todayTotal)} today`,
      delta: todayDelta,
      icon: Wallet,
      accent: "blue",
    },
    {
      id: "orders",
      label: "Total Orders",
      value: totalOrders.toLocaleString(),
      sub: `${todaysSales.length} orders today`,
      delta: null,
      icon: ShoppingCart,
      accent: "indigo",
    },
    {
      id: "stock",
      label: "Low Stock Alerts",
      value: lowStock.length.toString(),
      sub: lowStock.length ? "Items need reorder" : "All levels healthy",
      delta: null,
      icon: AlertTriangle,
      accent: lowStock.length > 0 ? "amber" : "emerald",
    },
    {
      id: "customers",
      label: "Customers",
      value: customers.length.toLocaleString(),
      sub: `${vipCount} VIP member${vipCount !== 1 ? "s" : ""}`,
      delta: null,
      icon: Users,
      accent: "violet",
    },
  ] as const;

  const accentMap = {
    blue:    { iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100/50", borderClass: "border-t-4 border-t-emerald-600" },
    indigo:  { iconBg: "bg-blue-50 text-blue-700 border-blue-100/50", borderClass: "border-t-4 border-t-blue-600" },
    amber:   { iconBg: "bg-amber-50 text-amber-700 border-amber-100/50", borderClass: "border-t-4 border-t-amber-500" },
    emerald: { iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100/50", borderClass: "border-t-4 border-t-emerald-600" },
    violet:  { iconBg: "bg-violet-50 text-violet-700 border-violet-100/50", borderClass: "border-t-4 border-t-violet-600" },
  } as const;

  return (
    <div className="space-y-4">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-lg border border-teal-100/80 bg-teal-50/40 border-l-4 border-l-primary shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
              Live
            </span>
            <span className="text-xs text-slate-600 font-semibold">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-teal-900 tracking-tight">
            {greeting}, Mizan 👋
          </h1>
          <p className="text-xs md:text-sm text-teal-950 font-semibold mt-0.5">
            Here&apos;s a quick summary of what&apos;s happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="h-9 text-sm text-slate-700 border-slate-200/80 hover:bg-slate-100 bg-white">
            <Link href="/dashboard/products">
              <Package className="h-3.5 w-3.5 mr-1.5 text-teal-700" /> Products
            </Link>
          </Button>
          <Button asChild size="sm" className="h-9 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 text-sm">
            <Link href="/dashboard/sales/create">
              <ScanBarcode className="h-3.5 w-3.5 mr-1.5" /> New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPI metric cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const a = accentMap[kpi.accent];
          return (
            <div
              key={kpi.id}
              className={cn(
                "bg-card rounded-lg border border-border shadow-sm p-4 transition-all duration-300",
                "hover:shadow-md hover:-translate-y-1 hover:border-slate-300/80 group",
                a.borderClass
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("h-10 w-10 rounded-lg grid place-items-center border", a.iconBg)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                {kpi.delta !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                      kpi.delta >= 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-red-50 text-red-600 border-red-100",
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
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {kpi.label}
              </p>
              <p className="text-2xl font-extrabold text-slate-800 tracking-tight tabular-nums">
                {kpi.value}
              </p>
              <p className="text-xs text-slate-600 mt-1 font-semibold">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Storefront block ─────────────────────────────────────────── */}
      <StorefrontBlock />

      {/* ── Charts row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly revenue bar chart */}
        <div className="lg:col-span-2 bg-card rounded-md border border-border shadow-sm overflow-hidden">
          <SectionHeader
            icon={BarChart3}
            title="Monthly Revenue"
            subtitle="Last 6 months at a glance"
            iconBg="bg-teal-50"
            iconColor="text-teal-700"
          />
          <div className="px-4 pb-4 pt-3">
            {monthlyChart.every((m) => m.total === 0) ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400">
                <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No sales data yet</p>
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart} margin={{ left: 0, right: 4, top: 4, bottom: 0 }} barSize={28}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={1} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="total" fill="url(#revenueGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Stock distribution donut */}
        <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
          <SectionHeader
            icon={Package}
            title="Stock Health"
            subtitle="Distribution by status"
            iconBg="bg-teal-50"
            iconColor="text-teal-700"
            href="/dashboard/inventory"
            linkLabel="Inventory"
          />
          <div className="px-4 pb-4 pt-2">
            {products.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400">
                <Package className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No product data</p>
              </div>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {stockDonut.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-card border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                              <span className="font-semibold text-slate-700">{d.name}</span>
                              <span className="ml-2 text-slate-500">{d.value} SKUs</span>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {stockDonut.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700 tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent invoices + Top products ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent invoices table */}
        <div className="lg:col-span-3 bg-card rounded-md border border-border shadow-sm overflow-hidden">
          <SectionHeader
            icon={Receipt}
            title="Recent Invoices"
            subtitle={`${recent.length} most recent transactions`}
            href="/dashboard/sales"
            linkLabel="All invoices"
            iconBg="bg-teal-50"
            iconColor="text-teal-700"
          />
          {recent.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-slate-400">
              <Receipt className="h-10 w-10 mb-2 opacity-25" />
              <p className="text-sm font-medium">No invoices yet</p>
              <p className="text-xs mt-1">Create your first sale to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-teal-600 bg-teal-700 text-white">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-teal-50">Invoice</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-teal-50">Customer</th>
                    <th className="hidden md:table-cell text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-teal-50">Date</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-teal-50">Status</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-teal-50">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      onClick={() => {}}
                    >
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-700 text-xs tracking-tight">
                          #{s.invoiceNo}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-sm bg-teal-700 grid place-items-center text-white text-[10px] font-bold shrink-0">
                            {(s.customerName || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-700 text-[13px] font-medium truncate max-w-[120px]">
                            {s.customerName || "Walk-in"}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(s.date)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge
                          method={s.paymentMethod}
                          total={s.total}
                          paid={s.amountPaid}
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-bold text-slate-700 tabular-nums text-[13px]">
                          {formatCurrency(s.total)}
                        </span>
                        {s.total > s.amountPaid && (
                          <p className="text-xs text-orange-700 font-semibold">
                            Due {formatCurrency(s.total - s.amountPaid)}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recent.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link
                href="/dashboard/sales"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 transition"
              >
                View all invoices <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Top products + Reorder queue */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Top selling products */}
          <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden flex-1">
            <SectionHeader
              icon={BarChart3}
              title="Top Products"
              subtitle="By units sold"
              iconBg="bg-teal-50"
              iconColor="text-teal-700"
            />
            {topProducts.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                <Package className="h-8 w-8 mb-2 opacity-25" />
                <p className="text-xs">No sales data yet</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-3">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0].qty;
                  const pct = Math.max(8, (p.qty / Math.max(1, maxQty)) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-extrabold text-slate-500 w-4 shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-slate-700 truncate">
                            {p.name}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums ml-2 shrink-0">
                            {p.qty} sold
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-700 to-teal-500 rounded-full transition-all duration-500"
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
          <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
            <SectionHeader
              icon={AlertTriangle}
              title="Reorder Queue"
              subtitle={`${lowStock.length} items below threshold`}
              href="/dashboard/restock-orders"
              linkLabel="Restock"
              iconBg="bg-teal-50"
              iconColor="text-teal-700"
            />
            {lowStock.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <div className="h-9 w-9 rounded-full bg-emerald-50 grid place-items-center mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-xs font-medium text-slate-600">All levels healthy</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No reorder needed.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                {lowStock.slice(0, 5).map((p) => {
                  const reorder = effectiveReorderPoint(p);
                  const suggested = suggestedPoQty(p);
                  const ratio = Math.min(1, p.stock / Math.max(1, reorder));
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition">
                      <div className="h-8 w-8 rounded-lg bg-amber-50 grid place-items-center text-base shrink-0">
                        {p.emoji || "📦"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-slate-700 truncate">
                          {productDisplayName(p)}
                        </p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              ratio < 0.4 ? "bg-red-600" : "bg-amber-500",
                            )}
                            style={{ width: `${Math.max(6, ratio * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">
                          {p.stock} in stock · reorder at {reorder}
                        </p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] border-slate-200 shrink-0"
                      >
                        <Link
                          href={`/dashboard/purchases?createPO=${p.id}&qty=${suggested}${p.supplierId ? `&supplier=${p.supplierId}` : ""}`}
                        >
                          PO
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
