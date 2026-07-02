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
import { Download, BarChart3, Boxes, Receipt, Calculator, TrendingUp, TrendingDown, Layers, Box, Printer } from "lucide-react";
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

  const [activeTab, setActiveTab] = useState("pl");

  const { data: metrics, isLoading: isMetricsLoading } = useReportsMetricsQuery({ from, to, paymentMethod: method });
  const { data: inventory, isLoading: isInventoryLoading } = useInventoryMetricsQuery({ from, to });

  const exportData = () => {
    if (activeTab === "inventory") {
      if (!inventory) return;
      // Combine Low Stock and Dead Stock into one CSV, or export them separately
      const rows: (string | number)[][] = [
        ["Inventory Report"],
        [`Date Range: ${from} to ${to}`],
        [""],
        ["-- LOW STOCK --"],
        ["Product Name", "Current Stock", "Reorder Level"],
        ...inventory.lowStock.map(p => [p.name, p.stock, p.minStock]),
        [""],
        ["-- DEAD STOCK --"],
        ["Product Name", "Category", "Current Stock", "Value"],
        ...inventory.deadStock.map(p => [p.name, p.category, p.stock, p.value]),
      ];
      downloadCSV(`inventory_report_${from}_to_${to}.csv`, rows);
      toast.success("Inventory report downloaded!");
    } else {
      if (!metrics) return;
      const rows: (string | number)[][] = [
        ["Business Report - Summary"],
        [`Date Range: ${from} to ${to}`],
        [`Payment Method Filter: ${method}`],
        [""],
        ["-- FINANCIAL OVERVIEW --"],
        ["Total Revenue", metrics.totalRevenue],
        ["Total Transactions", metrics.txnCount],
        ["Average Order Value", metrics.aov],
        ["Cost of Goods Sold (COGS)", metrics.cogs],
        ["Gross Profit", metrics.grossProfit],
        ["Total Expenses", metrics.expenseTotal],
        ["Net Profit", metrics.netProfit],
        [""],
        ["-- EXPENSES BREAKDOWN --"],
        ["Category", "Amount"],
        ...metrics.expensesList.map((e) => [e.category, e.total]),
        [""],
        ["-- TOP SELLING PRODUCTS --"],
        ["Product Name", "Quantity Sold", "Generated Revenue"],
        ...metrics.topProducts.map((p) => [p.name, p.qty, p.revenue])
      ];
      downloadCSV(`business_report_${from}_to_${to}.csv`, rows);
      toast.success("Report downloaded successfully!");
    }
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

  const handlePrint = () => {
    window.print();
  };

  const setPreset = (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "allTime") => {
    const d = new Date();
    const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (preset === "today") {
      setFrom(todayStr);
      setTo(todayStr);
    } else if (preset === "yesterday") {
      d.setDate(d.getDate() - 1);
      const yStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      setFrom(yStr);
      setTo(yStr);
    } else if (preset === "thisWeek") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const firstDay = new Date(d.setDate(diff));
      setFrom(new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      setFrom(new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (preset === "allTime") {
      setFrom("2020-01-01");
      setTo(todayStr);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 print:p-0 print:m-0 print:space-y-4">
      
      {/* ── Print Header (Hidden on Screen) ── */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-6 mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">
          {activeTab === "pl" ? "P&L Report" : activeTab === "sales" ? "Sales Report" : "Inventory Report"}
        </h1>
        <p className="text-lg font-bold text-slate-600 mt-2">Date Range: {from} to {to}</p>
        <p className="text-sm font-medium text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* ── Page Header (Clean) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-950 p-6 sm:p-8 shadow-xl print:hidden">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/20 blur-[100px] rounded-full" />
        
        <div className="relative z-10 flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-400" />
            Business Reports
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Deep dive into your sales, P&L, and inventory health.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        {/* Tabs and Filters Container */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 print:hidden">
          
          <div className="bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60 inline-flex overflow-x-auto w-full xl:w-auto">
            <TabsList className="bg-transparent gap-2 w-full justify-start">
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

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 font-bold text-xs" onClick={() => setPreset("today")}>Today</Button>
              <Button size="sm" variant="outline" className="h-8 font-bold text-xs" onClick={() => setPreset("yesterday")}>Yesterday</Button>
              <Button size="sm" variant="outline" className="h-8 font-bold text-xs" onClick={() => setPreset("thisWeek")}>This Week</Button>
              <Button size="sm" variant="outline" className="h-8 font-bold text-xs" onClick={() => setPreset("thisMonth")}>This Month</Button>
              <Button size="sm" variant="outline" className="h-8 font-bold text-xs" onClick={() => setPreset("allTime")}>All Time</Button>
            </div>
            
            <div className="flex flex-wrap items-end gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">From</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="font-bold h-9 w-36" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">To</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="font-bold h-9 w-36" />
              </div>
              {activeTab !== "inventory" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Method</label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-32 h-9 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Tenders</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button size="sm" variant="outline" className="font-bold h-9" onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" /> 
                  Export {activeTab === "pl" ? "P&L" : activeTab === "sales" ? "Sales" : "Inventory"}
                </Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 shadow-md" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> 
                  Print {activeTab === "pl" ? "P&L" : activeTab === "sales" ? "Sales" : "Inventory"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── PROFIT & LOSS ── */}
        <TabsContent value="pl" className="space-y-6 mt-0 print:block">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <Stat label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={TrendingUp} bg="from-indigo-500 to-blue-600" text="text-white" />
            <Stat label="Cost of Goods" value={formatCurrency(metrics.cogs)} icon={Layers} bg="from-slate-700 to-slate-800" text="text-white" />
            <Stat label="Total Expenses" value={formatCurrency(metrics.expenseTotal)} icon={TrendingDown} bg="from-rose-500 to-red-600" text="text-white" />
            <Stat label="Gross Profit" value={formatCurrency(metrics.grossProfit)} icon={Calculator} bg="from-teal-500 to-emerald-600" text="text-white" />
            <Stat label="Net Profit" value={formatCurrency(metrics.netProfit)} icon={TrendingUp} bg={metrics.netProfit >= 0 ? "from-indigo-600 to-purple-600" : "from-red-600 to-rose-700"} text="text-white" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col print:border-none print:shadow-none">
              <div className="p-6 border-b border-slate-100/50 print:px-0">
                <h3 className="text-base font-bold text-slate-800">Expenses Breakdown</h3>
                <p className="text-xs text-slate-500 mt-1">Categorized spending in range</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 print:bg-transparent">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider print:px-0">Category</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider print:px-0">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.expensesList.map((e) => (
                      <tr key={e.category} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 print:px-0"><Badge variant="outline" className="font-bold text-slate-600 bg-white shadow-sm border-slate-200">{e.category}</Badge></td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-800 print:px-0">{formatCurrency(e.total)}</td>
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
        <TabsContent value="sales" className="space-y-6 mt-0 print:block">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Stat label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={TrendingUp} bg="from-indigo-500 to-purple-600" text="text-white" />
            <Stat label="Transactions" value={metrics.txnCount.toString()} icon={Receipt} bg="from-blue-500 to-cyan-600" text="text-white" />
            <Stat label="Products Sold" value={metrics.topProducts.reduce((sum, p) => sum + p.qty, 0).toString()} icon={Box} bg="from-amber-500 to-orange-600" text="text-white" />
            <Stat label="Average Order Value" value={formatCurrency(metrics.aov)} icon={Calculator} bg="from-emerald-500 to-teal-600" text="text-white" />
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
              <Button size="sm" variant="outline" className="bg-white shadow-sm border-slate-200 text-slate-700 font-bold" onClick={exportData}>
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
                <p className="text-xs text-rose-700/80 mt-1">Active inventory with no sales in selected date range</p>
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
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-xl border border-white/10 transition-transform hover:-translate-y-1 print:shadow-none print:border-slate-200", bg)}>
      <div className="absolute top-0 right-0 p-4 opacity-20 print:opacity-5">
        <Icon className={cn("h-16 w-16", text)} />
      </div>
      <div className="relative z-10">
        <p className={cn("text-[11px] font-extrabold uppercase tracking-widest mb-1 opacity-90 print:text-slate-500", text)}>{label}</p>
        <p className={cn("text-2xl lg:text-3xl font-extrabold tracking-tight tabular-nums drop-shadow-md print:drop-shadow-none print:text-slate-900", text)}>{value}</p>
      </div>
    </div>
  );
}
