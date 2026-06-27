"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { Download, BarChart3, Boxes, Receipt, Calculator, TrendingUp, TrendingDown, Layers, Box } from "lucide-react";
import { toast } from "sonner";
import { useReportsMetricsQuery, useInventoryMetricsQuery } from "@/features/reports/hooks";
import { cn } from "@/shared/lib/utils";
// We no longer import heavy client side aggregations! All calculation is safely managed backend.

const COLORS = ["#6366f1", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

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

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient() {
  usePageTitle("Reports");

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 29);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [method, setMethod] = useState<string>("All");

  const { data: metrics, isLoading: isMetricsLoading } = useReportsMetricsQuery({ from, to, paymentMethod: method });
  const { data: inventory, isLoading: isInventoryLoading } = useInventoryMetricsQuery();

  const exportSales = () => {
    toast.info("Backend export not fully implemented for large datasets yet. Coming soon!");
  };

  if (isMetricsLoading || isInventoryLoading || !metrics || !inventory) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Running aggregates securely...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* ── Page Header & Filters ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-950 p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/20 blur-[100px] rounded-full" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-indigo-400" />
              Business Reports
            </h1>
            <p className="text-sm text-slate-300 font-medium mt-1.5">
              Deep dive into your sales, P&L, and inventory health.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            <div>
              <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider block mb-1.5">From</label>
              <Input 
                type="date" 
                value={from} 
                onChange={(e) => setFrom(e.target.value)} 
                className="bg-white/90 border-white/20 text-slate-800 font-bold h-9 w-40" 
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider block mb-1.5">To</label>
              <Input 
                type="date" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                className="bg-white/90 border-white/20 text-slate-800 font-bold h-9 w-40" 
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider block mb-1.5">Method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-36 bg-white/90 border-white/20 text-slate-800 font-bold h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Tenders</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pl" className="w-full">
        <div className="bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60 inline-flex mb-6 w-full sm:w-auto overflow-x-auto">
          <TabsList className="bg-transparent gap-2">
            <TabsTrigger value="pl" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-bold text-slate-600 data-[state=active]:text-indigo-600">
              <Calculator className="h-4 w-4 mr-2" /> P&L
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-bold text-slate-600 data-[state=active]:text-indigo-600">
              <Receipt className="h-4 w-4 mr-2" /> Sales
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-bold text-slate-600 data-[state=active]:text-indigo-600">
              <Boxes className="h-4 w-4 mr-2" /> Inventory
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── PROFIT & LOSS ── */}
        <TabsContent value="pl" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Stat label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={TrendingUp} bg="from-blue-50 to-cyan-50" text="text-blue-700" />
            <Stat label="Cost of Goods (COGS)" value={formatCurrency(metrics.cogs)} icon={Layers} bg="from-amber-50 to-orange-50" text="text-amber-700" />
            <Stat label="Gross Profit" value={formatCurrency(metrics.grossProfit)} icon={Calculator} bg="from-emerald-50 to-teal-50" text="text-emerald-700" />
            <Stat label="Net Profit" value={formatCurrency(metrics.netProfit)} icon={TrendingUp} bg={metrics.netProfit >= 0 ? "from-indigo-50 to-purple-50" : "from-red-50 to-rose-50"} text={metrics.netProfit >= 0 ? "text-indigo-700" : "text-red-600"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Financial Overview</h3>
                  <p className="text-xs text-slate-500">Revenue vs COGS vs Expenses vs Net</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Revenue", value: metrics.totalRevenue },
                    { name: "COGS", value: metrics.cogs },
                    { name: "Expenses", value: metrics.expenseTotal },
                    { name: "Net Profit", value: metrics.netProfit },
                  ]} margin={{ left: 20 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} fontWeight={600} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} barSize={48}>
                      {
                        [...Array(4)].map((_, i) => (
                          <Cell key={i} fill={i === 1 ? "#fbbf24" : i === 2 ? "#f87171" : i === 3 && metrics.netProfit < 0 ? "#ef4444" : "url(#barGrad)"} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100/50">
                <h3 className="text-base font-bold text-slate-800">Expenses Breakdown</h3>
                <p className="text-xs text-slate-500 mt-1">Categorized spending in range</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Category</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.expensesList.map((e) => (
                      <tr key={e.category} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3"><Badge variant="outline" className="font-bold text-slate-600 bg-white shadow-sm border-slate-200">{e.category}</Badge></td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-800">{formatCurrency(e.total)}</td>
                      </tr>
                    ))}
                    {metrics.expensesList.length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 font-medium">No expenses recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── SALES ── */}
        <TabsContent value="sales" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Stat label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={TrendingUp} bg="from-indigo-50 to-purple-50" text="text-indigo-700" />
            <Stat label="Transactions" value={metrics.txnCount.toString()} icon={Receipt} bg="from-blue-50 to-cyan-50" text="text-blue-700" />
            <Stat label="Average Order Value" value={formatCurrency(metrics.aov)} icon={Calculator} bg="from-emerald-50 to-teal-50" text="text-emerald-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden p-6">
              <h3 className="text-base font-bold text-slate-800 mb-6">Sales Trend</h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.trend} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} dy={10} interval={Math.floor(metrics.trend.length / 7)} />
                    <YAxis stroke="#64748b" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 2, strokeDasharray: "4 4" }} />
                    <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden p-6 flex flex-col items-center justify-center">
              <h3 className="text-base font-bold text-slate-800 w-full mb-2">By Payment Method</h3>
              <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metrics.byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                      {metrics.byMethod.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {metrics.byMethod.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {m.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Top Selling Products</h3>
                <p className="text-xs text-slate-500 mt-1">Best performers in selected range</p>
              </div>
              <Button size="sm" variant="outline" className="bg-white shadow-sm border-slate-200 text-slate-700 font-bold" onClick={exportSales}>
                <Download className="h-3.5 w-3.5 mr-2" /> Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-1.5 px-4 pb-4">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Product Name</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Quantity Sold</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Generated Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topProducts.map((p, i) => (
                    <tr key={i} className="bg-white shadow-sm hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 rounded-l-xl border-y border-l border-slate-100">
                        <span className="font-bold text-slate-700">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center border-y border-slate-100">
                        <span className="inline-block bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-md">
                          {p.qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right rounded-r-xl border-y border-r border-slate-100">
                        <span className="font-extrabold text-slate-800">{formatCurrency(p.revenue)}</span>
                      </td>
                    </tr>
                  ))}
                  {metrics.topProducts.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-10 text-slate-400 font-medium bg-white rounded-xl">No products sold in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── INVENTORY ── */}
        <TabsContent value="inventory" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Stat label="Total Asset Value" value={formatCurrency(inventory.stockValue)} icon={Calculator} bg="from-teal-50 to-emerald-50" text="text-teal-700" />
            <Stat label="Low Stock Alerts" value={inventory.lowStock.length.toString()} icon={TrendingDown} bg="from-amber-50 to-orange-50" text="text-amber-700" />
            <Stat label="Dead Stock (90 Days)" value={inventory.deadStock.length.toString()} icon={Box} bg="from-rose-50 to-red-50" text="text-red-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-slate-100/50 bg-amber-50/50">
                <h3 className="text-base font-bold text-amber-900">Low Stock Queue</h3>
                <p className="text-xs text-amber-700/80 mt-1">Items at or below reorder level</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Product</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.lowStock.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded shadow-sm">{p.stock} / {p.minStock}</span>
                        </td>
                      </tr>
                    ))}
                    {inventory.lowStock.length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-10 text-center text-slate-400 font-medium">No low stock items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-slate-100/50 bg-rose-50/50">
                <h3 className="text-base font-bold text-rose-900">Dead Stock Value</h3>
                <p className="text-xs text-rose-700/80 mt-1">Active inventory with no sales in 90 days</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Product</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Stock</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider">Tied Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.deadStock.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-rose-50/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{p.category}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">{p.stock} {p.unit}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-rose-700">{formatCurrency(p.value)}</td>
                      </tr>
                    ))}
                    {inventory.deadStock.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400 font-medium">No dead stock found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon: Icon, bg, text }: { label: string; value: string; icon: any; bg: string; text: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg border border-white/40", bg)}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon className={cn("h-16 w-16", text)} />
      </div>
      <div className="relative z-10">
        <p className={cn("text-[11px] font-extrabold uppercase tracking-widest mb-1 opacity-80", text)}>{label}</p>
        <p className={cn("text-3xl font-extrabold tracking-tight tabular-nums", text)}>{value}</p>
      </div>
    </div>
  );
}
