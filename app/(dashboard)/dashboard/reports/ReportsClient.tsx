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
import { Download, BarChart3, Boxes, Receipt, Calculator, TrendingUp, TrendingDown, Layers, Box, Printer, Search, UserMinus, Scale, CreditCard, ArrowDownRight, ArrowUpRight, Percent, ClipboardList, AlertCircle, RefreshCw, Phone } from "lucide-react";
import { toast } from "sonner";
import { useReportsMetricsQuery, useInventoryMetricsQuery, useDuesMetricsQuery, useExpensesDetailedQuery } from "@/features/reports/hooks";
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
  const [searchLowStock, setSearchLowStock] = useState("");
  const [searchExpense, setSearchExpense] = useState("");

  const { data: metrics, isLoading: isMetricsLoading, isError: isMetricsError } = useReportsMetricsQuery({ from, to, paymentMethod: method });
  const { data: inventory, isLoading: isInventoryLoading, isError: isInventoryError } = useInventoryMetricsQuery({ from, to });
  const { data: dues, isLoading: isDuesLoading, isError: isDuesError } = useDuesMetricsQuery();
  const { data: expensesDetailed, isLoading: isExpensesDetailedLoading, isError: isExpensesDetailedError } = useExpensesDetailedQuery({ from, to });

  const exportPL = () => {
    if (!metrics) return;
    const rows: (string | number)[][] = [
      ["Profit & Loss Report"],
      [`Date Range: ${from} to ${to}`],
      [""],
      ["Gross Profit", metrics.grossProfit],
      ["Net Profit", metrics.netProfit],
      ["Opening Stock", metrics.openingStock],
      [""],
      ["-- PURCHASES --"],
      ["Total Purchase", metrics.totalPurchase],
      ["Total Purchase Tax", metrics.totalPurchaseTax],
      ["Total Other Charges of Purchase", metrics.totalOtherChargesPurchase],
      ["Total Discount on Purchase", metrics.totalDiscountPurchase],
      ["Paid Payment", metrics.paidPurchase],
      ["Purchase Due", metrics.duePurchase],
      [""],
      ["-- PURCHASE RETURNS --"],
      ["Total Purchase Return", metrics.totalPurchaseReturn],
      ["Total Purchase Return Tax", metrics.totalPurchaseReturnTax],
      ["Total Other Charges of Purchase Return", metrics.totalOtherChargesPurchaseReturn],
      ["Total Discount on Purchase Return", metrics.totalDiscountPurchaseReturn],
      ["Paid Payment", metrics.paidPurchaseReturn],
      ["Purchase Return Due", metrics.duePurchaseReturn],
      [""],
      ["-- EXPENSES --"],
      ["Total Expense", metrics.expenseTotal],
      [""],
      ["-- SALES --"],
      ["Sales (Before Tax)", metrics.salesBeforeTax],
      ["Total Sales Tax", metrics.totalSalesTax],
      ["Total Other Charges of Sales", metrics.totalOtherChargesSales],
      ["Total Discount on Sales", metrics.totalDiscountSales],
      ["Coupon Discount", metrics.couponDiscount],
      ["Total Sales", metrics.totalSales],
      ["Paid Payment", metrics.paidSales],
      ["Sales Due", metrics.dueSales],
      [""],
      ["-- SALES RETURNS --"],
      ["Total Sales Return", metrics.totalSalesReturn],
      ["Total Sales Return Tax", metrics.totalSalesReturnTax],
      ["Total Other Charges of Sales Return", metrics.totalOtherChargesSalesReturn],
      ["Coupon Discount", metrics.couponDiscountSalesReturn],
      ["Total Discount on Sales Return", metrics.totalDiscountSalesReturn],
      ["Return Total", metrics.returnTotal],
      ["Paid Payment", metrics.paidSalesReturn],
      ["Sales Return Due", metrics.dueSalesReturn],
      [""],
      ["-- EXPENSES BREAKDOWN --"],
      ["Category", "Amount"],
      ...metrics.expensesList.map((e) => [e.category, e.total])
    ];
    downloadCSV(`pl_report_${from}_to_${to}.csv`, rows);
    toast.success("P&L report downloaded!");
  };

  const exportSales = () => {
    if (!metrics) return;
    const rows: (string | number)[][] = [
      ["Sales Report"],
      [`Date Range: ${from} to ${to}`],
      [`Payment Method: ${method}`],
      [""],
      ["Total Revenue", metrics.totalRevenue],
      ["Total Transactions", metrics.txnCount],
      ["Average Order Value", metrics.aov],
      [""],
      ["-- TOP SELLING PRODUCTS --"],
      ["Product Name", "Quantity Sold", "Generated Revenue"],
      ...metrics.topProducts.map((p) => [p.name, p.qty, p.revenue])
    ];
    downloadCSV(`sales_report_${from}_to_${to}.csv`, rows);
    toast.success("Sales report downloaded!");
  };

  const exportLowStock = () => {
    if (!inventory) return;
    const rows: (string | number)[][] = [
      ["Low Stock Report"],
      ["Generated on", new Date().toLocaleDateString()],
      [""],
      ["Product Name", "Current Stock", "Reorder Level"],
      ...inventory.lowStock.map(p => [p.name, p.stock, p.minStock])
    ];
    downloadCSV(`low_stock_report.csv`, rows);
    toast.success("Low stock report downloaded!");
  };

  const exportDeadStock = () => {
    if (!inventory) return;
    const rows: (string | number)[][] = [
      ["Dead Stock Report"],
      [`Inactivity Range: ${from} to ${to}`],
      [""],
      ["Product Name", "Category", "Current Stock", "Value"],
      ...inventory.deadStock.map(p => [p.name, p.category, p.stock, p.value])
    ];
    downloadCSV(`dead_stock_report.csv`, rows);
    toast.success("Dead stock report downloaded!");
  };

  const exportDues = () => {
    if (!dues) return;
    const rows: (string | number)[][] = [
      ["Dues Report"],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      ["-- CUSTOMER RECEIVABLES --"],
      ["Customer Name", "Phone", "Due Amount"],
      ...dues.customers.map(c => [c.name, c.phone, c.due]),
      [""],
      ["Total Customer Due", dues.totalCustomerDue],
      [""],
      ["-- SUPPLIER PAYABLES --"],
      ["Supplier Name", "Phone", "Payable Amount"],
      ...dues.suppliers.map(s => [s.name, s.phone, s.payable]),
      [""],
      ["Total Supplier Payable", dues.totalSupplierPayable]
    ];
    downloadCSV(`dues_report.csv`, rows);
    toast.success("Dues report downloaded!");
  };

  const exportExpensesDetailed = () => {
    if (!expensesDetailed) return;
    const rows: (string | number)[][] = [
      ["Detailed Expenses Report"],
      [`Date Range: ${from} to ${to}`],
      [""],
      ["-- CATEGORY SUMMARY --"],
      ["Category", "Expenses Count", "Total Spent", "Percentage"],
      ...expensesDetailed.breakdown.map(b => [b.category, b.count, b.amount, `${b.percentage.toFixed(1)}%`]),
      [""],
      ["Total Expenses", expensesDetailed.totalExpense],
      [""],
      ["-- DETAILED EXPENSE LOG --"],
      ["Category", "Date", "Notes", "Amount"],
      ...expensesDetailed.expenses.map(e => [e.category, formatDate(e.date), e.notes, e.amount])
    ];
    downloadCSV(`expenses_detailed_report_${from}_to_${to}.csv`, rows);
    toast.success("Expenses detailed report downloaded!");
  };

  const hasError = isMetricsError || isInventoryError || isDuesError || isExpensesDetailedError;

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6 animate-in fade-in duration-300">
        <div className="relative max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-100/50 text-center space-y-6 overflow-hidden">
          {/* Radial red glow */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full blur-3xl bg-rose-500/10 -mr-10 -mt-10 -z-10" />
          
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner">
            <AlertCircle className="h-6 w-6 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">রিপোর্ট লোড করতে সমস্যা হয়েছে</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না অথবা ডেটাবেজে কোনো জটিলতা দেখা দিয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করুন অথবা আমাদের সাপোর্ট টিমের সাথে কথা বলুন।
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1 h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin-slow" /> পেজ রিফ্রেশ করুন
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-9 text-xs font-semibold border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
              onClick={() => window.open("https://wa.me/8801724363229", "_blank")} // Real or dynamic whatsapp link if needed, or default
            >
              <Phone className="h-3.5 w-3.5 mr-2 text-slate-500" /> সাপোর্টে কথা বলুন
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isMetricsLoading || isInventoryLoading || isDuesLoading || isExpensesDetailedLoading || !metrics || !inventory || !dues || !expensesDetailed) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">রিপোর্ট লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
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

  const renderDateFilters = (showMethod = false, onExport: () => void, printLabel: string) => (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-3 mb-6 bg-slate-50/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-sm print:hidden">
      <div className="flex flex-col gap-3 w-full xl:w-auto">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Presets:</span>
          {["today", "yesterday", "thisWeek", "thisMonth", "allTime"].map((preset) => {
            const labelMap = {
              today: "Today",
              yesterday: "Yesterday",
              thisWeek: "This Week",
              thisMonth: "This Month",
              allTime: "All Time",
            };
            return (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                className="h-7 text-[11px] font-bold px-3 rounded-lg text-slate-700 bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 shadow-sm shadow-slate-100/30 transition-all"
                onClick={() => setPreset(preset as any)}
              >
                {labelMap[preset as keyof typeof labelMap]}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl p-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 w-[120px] text-xs bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-slate-700 font-medium" />
            <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 border-l border-slate-100">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 w-[120px] text-xs bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-slate-700 font-medium" />
          </div>
          {showMethod && (
            <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl p-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Method</span>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-[130px] h-7 text-xs bg-transparent border-none shadow-none px-1 focus:ring-0 font-medium text-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200">
                  <SelectItem value="All">All Tenders</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 w-full xl:w-auto xl:justify-end mt-2 xl:mt-0">
        <Button size="sm" variant="outline" className="h-9 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 transition-all" onClick={onExport}>
          <Download className="h-3.5 w-3.5 mr-2 text-slate-500" /> Export CSV
        </Button>
        <Button size="sm" className="h-9 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-2" /> Print {printLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 print:p-0 print:m-0 print:space-y-4 printable-area">
      
      {/* ── Print Header (Hidden on Screen) ── */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          {activeTab === "pl" ? "P&L Report" 
           : activeTab === "sales" ? "Sales Report" 
           : activeTab === "inventory" ? "Inventory Report" 
           : activeTab === "dues" ? "Dues Report" 
           : "Expenses Report"}
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">Date Range: {from} to {to}</p>
      </div>

      {/* ── Page Header (Premium Gradient Banner) ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/40 border border-slate-800/80 mb-6 print:hidden">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl bg-indigo-500/10 -mr-20 -mt-20 -z-10" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full blur-3xl bg-violet-500/10 -mb-20 -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 w-fit px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
              <BarChart3 className="h-3 w-3" /> Shop Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Business Performance Reports
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed">
              Track sales, profits, expenses, outstanding dues, and inventory value with server-verified aggregates.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        {/* Tabs switcher Container */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5 print:hidden">
          <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 inline-flex overflow-x-auto w-full xl:w-auto shadow-sm shadow-slate-100/50">
            <TabsList className="bg-transparent gap-1.5 w-full justify-start h-auto p-0">
              {[
                { 
                  value: "pl", 
                  label: "P&L / লাভ-ক্ষতি", 
                  icon: Calculator,
                  activeClass: "data-[state=active]:bg-indigo-50/95 data-[state=active]:text-indigo-700 data-[state=active]:border-indigo-200/60 data-[state=active]:shadow-indigo-100/60",
                  hoverClass: "hover:bg-indigo-50/40 hover:text-indigo-700 hover:border-indigo-200/30",
                  iconColor: "text-indigo-500 group-hover:text-indigo-600"
                },
                { 
                  value: "sales", 
                  label: "Sales / বিক্রি", 
                  icon: Receipt,
                  activeClass: "data-[state=active]:bg-emerald-50/95 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-200/60 data-[state=active]:shadow-emerald-100/60",
                  hoverClass: "hover:bg-emerald-50/40 hover:text-emerald-700 hover:border-emerald-200/30",
                  iconColor: "text-emerald-500 group-hover:text-emerald-600"
                },
                { 
                  value: "inventory", 
                  label: "Inventory / স্টক", 
                  icon: Boxes,
                  activeClass: "data-[state=active]:bg-amber-50/95 data-[state=active]:text-amber-700 data-[state=active]:border-amber-200/60 data-[state=active]:shadow-amber-100/60",
                  hoverClass: "hover:bg-amber-50/40 hover:text-amber-700 hover:border-amber-200/30",
                  iconColor: "text-amber-500 group-hover:text-amber-600"
                },
                { 
                  value: "dues", 
                  label: "Dues / বকেয়া", 
                  icon: UserMinus,
                  activeClass: "data-[state=active]:bg-violet-50/95 data-[state=active]:text-violet-700 data-[state=active]:border-violet-200/60 data-[state=active]:shadow-violet-100/60",
                  hoverClass: "hover:bg-violet-50/40 hover:text-violet-700 hover:border-violet-200/30",
                  iconColor: "text-violet-500 group-hover:text-violet-600"
                },
                { 
                  value: "expenses", 
                  label: "Expenses / খরচ", 
                  icon: CreditCard,
                  activeClass: "data-[state=active]:bg-rose-50/95 data-[state=active]:text-rose-700 data-[state=active]:border-rose-200/60 data-[state=active]:shadow-rose-100/60",
                  hoverClass: "hover:bg-rose-50/40 hover:text-rose-700 hover:border-rose-200/30",
                  iconColor: "text-rose-500 group-hover:text-rose-600"
                },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "bg-white/45 text-slate-600 border border-slate-200/30 rounded-xl px-4 py-2 text-[12px] font-bold shadow-sm shadow-slate-100/10 transition-all duration-200 flex items-center h-9 data-[state=active]:shadow-md group",
                      tab.hoverClass,
                      tab.activeClass
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mr-2 transition-colors", tab.iconColor)} /> {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {/* ── PROFIT & LOSS ── */}
        <TabsContent value="pl" className="space-y-4 mt-0 print:block">
          {renderDateFilters(false, exportPL, "P&L")}

          {/* Top Summary Stat Cards (Restored Header Boxes) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5">
            <Stat label="Total Sales" value={formatCurrency(metrics.totalSales)} icon={TrendingUp} color="indigo" />
            <Stat label="Cost of Goods" value={formatCurrency(metrics.cogs)} icon={Layers} color="amber" />
            <Stat label="Total Expenses" value={formatCurrency(metrics.expenseTotal)} icon={TrendingDown} color="rose" />
            <Stat label="Gross Profit" value={formatCurrency(metrics.grossProfit)} icon={Calculator} color="emerald" />
            <Stat label="Net Profit" value={formatCurrency(metrics.netProfit)} icon={TrendingUp} color="emerald" />
          </div>

          {/* Two-Column Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Column: Stock & Purchases */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col print:border-none print:shadow-none">
                <div className="px-4 py-2.5 border-b border-slate-100/50 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Purchases & Stock Details</h3>
                  <div className="flex items-center gap-1.5 print:hidden">
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-medium text-slate-600" onClick={exportPL}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Export
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-medium text-slate-600" onClick={handlePrint}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Print
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse">
                    <tbody>
                      <PLRow label="Opening Stock" value={formatCurrency(metrics.openingStock)} badgeVariant="info" />
                      
                      <PLRow label="Purchase" isHeading />
                      <PLRow label="Total Purchase" value={formatCurrency(metrics.totalPurchase)} />
                      <PLRow label="Total Purchase Tax" value={formatCurrency(metrics.totalPurchaseTax)} />
                      <PLRow label="Total Other Charges of Purchase" value={formatCurrency(metrics.totalOtherChargesPurchase)} />
                      <PLRow label="Total Discount on Purchase" value={formatCurrency(metrics.totalDiscountPurchase)} />
                      <PLRow label="Paid Payment" value={formatCurrency(metrics.paidPurchase)} badgeVariant="success" />
                      <PLRow label="Purchase Due" value={formatCurrency(metrics.duePurchase)} badgeVariant="danger" />

                      <PLRow label="Purchase Return" isHeading />
                      <PLRow label="Total Purchase Return" value={formatCurrency(metrics.totalPurchaseReturn)} />
                      <PLRow label="Total Purchase Return Tax" value={formatCurrency(metrics.totalPurchaseReturnTax)} />
                      <PLRow label="Total Other Charges of Purchase Return" value={formatCurrency(metrics.totalOtherChargesPurchaseReturn)} />
                      <PLRow label="Total Discount on Purchase Return" value={formatCurrency(metrics.totalDiscountPurchaseReturn)} />
                      <PLRow label="Paid Payment" value={formatCurrency(metrics.paidPurchaseReturn)} badgeVariant="success" />
                      <PLRow label="Purchase Return Due" value={formatCurrency(metrics.duePurchaseReturn)} badgeVariant="danger" />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Expenses & Sales */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col print:border-none print:shadow-none">
                <div className="px-4 py-2.5 border-b border-slate-100/50 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Sales & Expenses Details</h3>
                  <div className="flex items-center gap-1.5 print:hidden">
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-medium text-slate-600" onClick={exportPL}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Export
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-medium text-slate-600" onClick={handlePrint}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Print
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse">
                    <tbody>
                      <PLRow label="Total Expense" value={formatCurrency(metrics.expenseTotal)} badgeVariant="danger" />
                      
                      <PLRow label="Sales" isHeading />
                      <PLRow label="Sales (Before Tax)" value={formatCurrency(metrics.salesBeforeTax)} />
                      <PLRow label="Total Sales Tax" value={formatCurrency(metrics.totalSalesTax)} />
                      <PLRow label="Total Other Charges of Sales" value={formatCurrency(metrics.totalOtherChargesSales)} />
                      <PLRow label="Total Discount on Sales" value={formatCurrency(metrics.totalDiscountSales)} />
                      <PLRow label="Coupon Discount" value={formatCurrency(metrics.couponDiscount)} />
                      <PLRow label="Total Sales" value={formatCurrency(metrics.totalSales)} bgClass="bg-slate-50/50" badgeVariant="highlight" />
                      <PLRow label="Paid Payment" value={formatCurrency(metrics.paidSales)} badgeVariant="success" />
                      <PLRow label="Sales Due" value={formatCurrency(metrics.dueSales)} badgeVariant="danger" />

                      <PLRow label="Sales Return" isHeading />
                      <PLRow label="Total Sales Return" value={formatCurrency(metrics.totalSalesReturn)} />
                      <PLRow label="Total Sales Return Tax" value={formatCurrency(metrics.totalSalesReturnTax)} />
                      <PLRow label="Total Other Charges of Sales Return" value={formatCurrency(metrics.totalOtherChargesSalesReturn)} />
                      <PLRow label="Coupon Discount" value={formatCurrency(metrics.couponDiscountSalesReturn)} />
                      <PLRow label="Total Discount on Sales Return" value={formatCurrency(metrics.totalDiscountSalesReturn)} />
                      <PLRow label="Return Total" value={formatCurrency(metrics.returnTotal)} bgClass="bg-slate-50/50" badgeVariant="highlight" />
                      <PLRow label="Paid Payment" value={formatCurrency(metrics.paidSalesReturn)} badgeVariant="success" />
                      <PLRow label="Sales Return Due" value={formatCurrency(metrics.dueSalesReturn)} badgeVariant="danger" />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

        </TabsContent>

        {/* ── SALES ── */}
        <TabsContent value="sales" className="space-y-4 mt-0 print:block">
          {renderDateFilters(true, exportSales, "Sales")}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={TrendingUp} color="indigo" />
            <Stat label="Transactions" value={metrics.txnCount.toString()} icon={Receipt} color="violet" />
            <Stat label="Products Sold" value={metrics.topProducts.reduce((sum, p) => sum + p.qty, 0).toString()} icon={Box} color="amber" />
            <Stat label="Avg Order Value" value={formatCurrency(metrics.aov)} icon={Calculator} color="emerald" />
          </div>


          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden print:overflow-visible print:border-none print:shadow-none">
            <div className="px-4 py-3 border-b border-slate-100/50 flex items-center justify-between print:px-0">
              <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Top Products</h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs font-medium text-slate-600 print:hidden" onClick={exportSales}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-[13px] border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-slate-500">
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Product Name</th>
                    <th className="text-center px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Qty Sold</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topProducts.map((p, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-1.5 font-medium text-slate-700">{p.name}</td>
                      <td className="px-4 py-1.5 text-center text-slate-600 font-semibold">{p.qty}</td>
                      <td className="px-4 py-1.5 text-right font-bold text-slate-800">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                  {metrics.topProducts.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-slate-400 font-medium">No products sold in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── INVENTORY ── */}
        <TabsContent value="inventory" className="space-y-4 mt-0 print:block">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat label="Total Asset Value" value={formatCurrency(inventory.stockValue)} icon={Calculator} color="indigo" />
            <Stat label="Low Stock Alerts" value={inventory.lowStock.length.toString()} icon={TrendingDown} color="rose" />
            <Stat label="Dead Stock (90 Days)" value={inventory.deadStock.length.toString()} icon={Box} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden print:overflow-visible flex flex-col h-[450px] print:h-auto print:border-none print:shadow-none">
              <div className="px-4 py-3 border-b border-slate-100/50 bg-amber-50/30 print:bg-transparent print:px-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-amber-900 print:text-slate-900 uppercase tracking-wide">Low Stock Queue</h3>
                  <div className="flex gap-1 print:hidden">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-amber-700 hover:bg-amber-100" onClick={exportLowStock}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-amber-700 hover:bg-amber-100" onClick={handlePrint}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col xl:flex-row gap-2 print:hidden">
                  <div className="flex items-center gap-2 bg-white/50 p-1 rounded border border-amber-100/60 w-fit">
                    <span className="text-[9px] font-bold text-amber-800 uppercase pl-1">From</span>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-6 w-[100px] text-[11px] bg-white border-amber-100/60 px-1" />
                    <span className="text-[9px] font-bold text-amber-800 uppercase px-1">To</span>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-6 w-[100px] text-[11px] bg-white border-amber-100/60 px-1" />
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-600/50" />
                    <Input 
                      placeholder="Search low stock..." 
                      value={searchLowStock}
                      onChange={(e) => setSearchLowStock(e.target.value)}
                      className="h-7 text-[11px] bg-white border-amber-200/50 pl-7 placeholder:text-amber-700/40 text-amber-900"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto print:overflow-visible">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Product</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.lowStock
                      .filter(p => p.name.toLowerCase().includes(searchLowStock.toLowerCase()))
                      .map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-amber-50/20 transition-colors">
                        <td className="px-4 py-1.5 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-1.5 text-right">
                          <span className="text-amber-700 font-bold bg-amber-100/50 px-2 py-0.5 rounded text-[11px] border border-amber-100">{p.stock} / {p.minStock}</span>
                        </td>
                      </tr>
                    ))}
                    {inventory.lowStock.filter(p => p.name.toLowerCase().includes(searchLowStock.toLowerCase())).length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400 font-medium">No items found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden print:overflow-visible flex flex-col h-[450px] print:h-auto print:border-none print:shadow-none">
              <div className="px-4 py-3 border-b border-slate-100/50 bg-rose-50/30 print:bg-transparent print:px-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-rose-900 print:text-slate-900 uppercase tracking-wide">Dead Stock Value</h3>
                  <div className="flex gap-1 print:hidden">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-700 hover:bg-rose-100" onClick={exportDeadStock}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-700 hover:bg-rose-100" onClick={handlePrint}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/50 p-1 rounded border border-rose-100/60 w-fit print:hidden">
                  <span className="text-[9px] font-bold text-rose-800 uppercase pl-1">From</span>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-6 w-[100px] text-[11px] bg-white border-rose-100/60 px-1" />
                  <span className="text-[9px] font-bold text-rose-800 uppercase px-1">To</span>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-6 w-[100px] text-[11px] bg-white border-rose-100/60 px-1" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto print:overflow-visible">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100">
                    <tr className="text-slate-500">
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Product</th>
                      <th className="text-center px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Stock</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.deadStock.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-rose-50/20 transition-colors">
                        <td className="px-4 py-1.5">
                          <span className="font-medium text-slate-800">{p.name}</span>
                          <span className="ml-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.category}</span>
                        </td>
                        <td className="px-4 py-1.5 text-center text-slate-600 font-medium">{p.stock}</td>
                        <td className="px-4 py-1.5 text-right font-bold text-rose-700">{formatCurrency(p.value)}</td>
                      </tr>
                    ))}
                    {inventory.deadStock.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 font-medium">No dead stock found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
         </TabsContent>

        {/* ── DUES REPORT ── */}
        <TabsContent value="dues" className="space-y-4 mt-0 print:block">
          {/* Summary title and export */}
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200/70 shadow-sm print:hidden">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Scale className="h-4 w-4 text-indigo-600" /> Outstanding Receivables & Payables
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs font-medium" onClick={exportDues}>
                <Download className="h-3.5 w-3.5 mr-2" /> Export Dues
              </Button>
              <Button size="sm" className="h-8 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-2" /> Print Dues
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
            <Stat label="Total Customer Due" value={formatCurrency(dues.totalCustomerDue)} icon={ArrowDownRight} color="rose" />
            <Stat label="Total Supplier Payable" value={formatCurrency(dues.totalSupplierPayable)} icon={ArrowUpRight} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Customer Dues */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col print:border-none print:shadow-none">
              <div className="px-4 py-2.5 border-b border-slate-100/50 flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Customer Receivables (বকেয়া)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Customer Name</th>
                      <th className="text-center px-4 py-2">Phone</th>
                      <th className="text-right px-4 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.customers.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-2 font-medium text-slate-700">{c.name}</td>
                        <td className="px-4 py-2 text-center text-slate-500 font-semibold">{c.phone}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200/80 font-bold text-[11px] px-2 py-0.5 shadow-none rounded-md">
                            {formatCurrency(c.due)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {dues.customers.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-6 text-slate-400 font-medium">No customer dues outstanding.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Supplier Dues */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col print:border-none print:shadow-none">
              <div className="px-4 py-2.5 border-b border-slate-100/50 flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Supplier Payables (দেনাদারি)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Supplier Name</th>
                      <th className="text-center px-4 py-2">Phone</th>
                      <th className="text-right px-4 py-2">Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.suppliers.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-2 font-medium text-slate-700">{s.name}</td>
                        <td className="px-4 py-2 text-center text-slate-500 font-semibold">{s.phone}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200/80 font-bold text-[11px] px-2 py-0.5 shadow-none rounded-md">
                            {formatCurrency(s.payable)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {dues.suppliers.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-6 text-slate-400 font-medium">No supplier payables outstanding.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── EXPENSES REPORT ── */}
        <TabsContent value="expenses" className="space-y-4 mt-0 print:block">
          {renderDateFilters(false, exportExpensesDetailed, "Expenses")}

          {/* Summary stats */}
          <div className="grid grid-cols-1 gap-3">
            <Stat label="Total Expenses" value={formatCurrency(expensesDetailed.totalExpense)} icon={TrendingDown} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Category Summary breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col h-fit print:border-none print:shadow-none">
              <div className="px-4 py-2.5 border-b border-slate-100/50 flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Category Summary</h3>
              </div>
              <div className="p-4 space-y-4">
                {expensesDetailed.breakdown.map((b) => (
                  <div key={b.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Badge variant="secondary" className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{b.category}</Badge>
                        <span className="text-[10px] font-normal text-slate-400">({b.count})</span>
                      </span>
                      <span>{formatCurrency(b.amount)} ({b.percentage.toFixed(1)}%)</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${b.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {expensesDetailed.breakdown.length === 0 && (
                  <p className="text-center py-6 text-slate-400 font-medium text-xs">No expense breakdown available.</p>
                )}
              </div>
            </div>

            {/* Right Column: Detailed Log */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col print:border-none print:shadow-none">
              <div className="px-4 py-2.5 border-b border-slate-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Expense Log (খরচের খাতা)</h3>
                {/* Search Bar */}
                <div className="relative w-full sm:w-[220px] print:hidden">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search expenses..."
                    value={searchExpense}
                    onChange={(e) => setSearchExpense(e.target.value)}
                    className="pl-8 h-7 text-xs bg-slate-50 border-slate-200 focus-visible:bg-white"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Category</th>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Notes</th>
                      <th className="text-right px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesDetailed.expenses
                      .filter((e) => 
                        e.category.toLowerCase().includes(searchExpense.toLowerCase()) ||
                        e.notes.toLowerCase().includes(searchExpense.toLowerCase())
                      )
                      .map((e) => (
                        <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-2 font-medium">
                            <Badge variant="outline" className="font-bold text-[9.5px] uppercase tracking-wider text-slate-600 bg-slate-50">{e.category}</Badge>
                          </td>
                          <td className="px-4 py-2 text-slate-500 font-semibold">{formatDate(e.date)}</td>
                          <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate" title={e.notes}>{e.notes || "—"}</td>
                          <td className="px-4 py-2 text-right font-bold text-rose-700">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    {expensesDetailed.expenses.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-6 text-slate-400 font-medium">No expenses logged.</td></tr>
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

function Stat({ label, value, icon: Icon, color = "indigo" }: { label: string; value: string; icon: any; color?: "indigo" | "emerald" | "rose" | "amber" | "violet" }) {
  const colorMap = {
    indigo: {
      border: "border-l-indigo-600 focus-within:border-l-indigo-600",
      iconBg: "bg-indigo-50 text-indigo-600",
      accent: "from-indigo-50/50 to-transparent",
    },
    emerald: {
      border: "border-l-emerald-600 focus-within:border-l-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
      accent: "from-emerald-50/50 to-transparent",
    },
    rose: {
      border: "border-l-rose-600 focus-within:border-l-rose-600",
      iconBg: "bg-rose-50 text-rose-700",
      accent: "from-rose-50/50 to-transparent",
    },
    amber: {
      border: "border-l-amber-600 focus-within:border-l-amber-600",
      iconBg: "bg-amber-50 text-amber-700",
      accent: "from-amber-50/50 to-transparent",
    },
    violet: {
      border: "border-l-violet-600 focus-within:border-l-violet-600",
      iconBg: "bg-violet-50 text-violet-600",
      accent: "from-violet-50/50 to-transparent",
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 border-l-[5px] transition-all duration-300 hover:shadow-lg hover:shadow-slate-100/80 hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]",
      scheme.border
    )}>
      {/* Background radial highlight */}
      <div className={cn("absolute right-0 top-0 w-24 h-24 rounded-full blur-2xl bg-gradient-to-br -z-10 opacity-70", scheme.accent)} />
      
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={cn("p-2 rounded-xl transition-colors duration-300", scheme.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      
      <div className="mt-2">
        <p className="text-2xl font-extrabold tracking-tight text-slate-800 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function PLRow({ 
  label, 
  value = "", 
  valueClass = "text-slate-800", 
  isHeading = false, 
  bgClass = "",
  badgeVariant
}: { 
  label: string; 
  value?: string | number; 
  valueClass?: string; 
  isHeading?: boolean; 
  bgClass?: string;
  badgeVariant?: "success" | "danger" | "info" | "neutral" | "highlight";
}) {
  if (isHeading) {
    return (
      <tr className="border-b border-slate-100">
        <td colSpan={2} className="px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-1 bg-indigo-600 rounded-full" />
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">{label}</span>
          </div>
        </td>
      </tr>
    );
  }

  let valueNode = <span className={cn("font-bold text-[12.5px] tabular-nums", valueClass)}>{value}</span>;

  if (badgeVariant === "success") {
    valueNode = (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold text-[11px] px-2 py-0.5 shadow-none rounded-md">
        {value}
      </Badge>
    );
  } else if (badgeVariant === "danger") {
    valueNode = (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200/80 font-bold text-[11px] px-2 py-0.5 shadow-none rounded-md">
        {value}
      </Badge>
    );
  } else if (badgeVariant === "info") {
    valueNode = (
      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200/80 font-bold text-[11px] px-2 py-0.5 shadow-none rounded-md">
        {value}
      </Badge>
    );
  } else if (badgeVariant === "highlight") {
    valueNode = (
      <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 font-bold text-[11px] px-2 py-0.5 shadow-none rounded-md">
        {value}
      </Badge>
    );
  }

  return (
    <tr className={cn("border-b border-slate-100/50 last:border-0 hover:bg-slate-50/30 transition-colors", bgClass)}>
      <td className="px-4 py-2.5 text-[12.5px] text-slate-500 font-semibold">{label}</td>
      <td className="px-4 py-2.5 text-right">{valueNode}</td>
    </tr>
  );
}
