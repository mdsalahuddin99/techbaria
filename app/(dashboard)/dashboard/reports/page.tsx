"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { useSales } from "@/features/sales/hooks";
import { useProducts } from "@/features/products/hooks";
import { useExpenses } from "@/features/expenses/hooks";
import { usePurchases } from "@/features/purchases/hooks";
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
import { formatCurrency, formatDate, productDisplayName } from "@/shared/lib/format";
import { Download, BarChart3, Boxes, Receipt, Calculator } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components";
import { useSalesReport } from "@/features/reports/hooks";
import { valuateInventory, aggregateByCategory, type ValuationMethod } from "@/features/reports/valuation";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))"];

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

export default function Reports() {
  usePageTitle("Reports");
  const { data: sales } = useSales();
  const { data: products } = useProducts();
  const { data: expenses } = useExpenses();
  const purchases = usePurchases();
  const [valMethod, setValMethod] = useState<ValuationMethod>("latest");

  const valuationRows = useMemo(
    () => valuateInventory({ products, purchases, sales, method: valMethod }),
    [products, purchases, sales, valMethod]
  );
  const valuationTotal = useMemo(
    () => valuationRows.reduce((s, r) => s + r.value, 0),
    [valuationRows]
  );
  const valuationByCategory = useMemo(
    () => aggregateByCategory(valuationRows),
    [valuationRows]
  );

  const exportValuation = () => {
    const rows: (string | number)[][] = [
      ["SKU", "Product", "Category", "Stock", "Unit Cost", "Value"],
      ...valuationRows.map((r) => [r.sku ?? "", r.name, r.category, r.stock, r.unitCost.toFixed(2), r.value.toFixed(2)]),
      [],
      ["Total", "", "", "", "", valuationTotal.toFixed(2)],
    ];
    downloadCSV(`valuation-${valMethod}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Valuation CSV exported");
  };

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 29);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [method, setMethod] = useState<string>("All");

  const {
    filteredSales, filteredExpenses, totalRevenue, txnCount, aov,
    cogs, expenseTotal, grossProfit, netProfit,
  } = useSalesReport({ from, to, paymentMethod: method });

  // Daily trend
  const trend = useMemo(() => {
    const days: Record<string, number> = {};
    const fromDate = new Date(from); const toDate = new Date(to);
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      days[key] = 0;
    }
    filteredSales.forEach((s) => {
      const key = new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (key in days) days[key] += s.total;
    });
    return Object.entries(days).map(([date, total]) => ({ date, total }));
  }, [filteredSales, from, to]);

  // Payment method breakdown
  const byMethod = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => { map[s.paymentMethod] = (map[s.paymentMethod] ?? 0) + s.total; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredSales.forEach((s) =>
      s.items.forEach((i) => {
        if (!map[i.productId]) map[i.productId] = { name: i.name, qty: 0, revenue: 0 };
        map[i.productId].qty += i.qty;
        map[i.productId].revenue += i.qty * i.price;
      })
    );
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [filteredSales]);

  const exportSales = () => {
    const rows: (string | number)[][] = [
      ["Invoice", "Date", "Customer", "Items", "Subtotal", "Discount", "Total", "Method"],
      ...filteredSales.map((s) => [
        s.invoiceNo, formatDate(s.date), s.customerName,
        s.items.reduce((a, i) => a + i.qty, 0),
        s.subtotal, s.discount, s.total, s.paymentMethod,
      ]),
    ];
    downloadCSV(`sales-${from}-to-${to}.csv`, rows);
    toast.success("CSV exported");
  };

  // Inventory report
  const stockValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const deadStock = useMemo(() => {
    const ninety = new Date(); ninety.setDate(ninety.getDate() - 90);
    const sold = new Set<string>();
    sales.forEach((s) => {
      if (new Date(s.date) >= ninety) s.items.forEach((i) => sold.add(i.productId));
    });
    return products.filter((p) => !sold.has(p.id) && p.stock > 0);
  }, [products, sales]);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);




  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Sales, inventory and profit insights for any date range."
      />
      {/* Date filter */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
              <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales"><Receipt className="h-3.5 w-3.5 mr-1" />Sales</TabsTrigger>
          <TabsTrigger value="inventory"><Boxes className="h-3.5 w-3.5 mr-1" />Inventory</TabsTrigger>
          <TabsTrigger value="valuation"><Calculator className="h-3.5 w-3.5 mr-1" />Valuation</TabsTrigger>
          <TabsTrigger value="pl"><BarChart3 className="h-3.5 w-3.5 mr-1" />Profit & Loss</TabsTrigger>
        </TabsList>

        {/* SALES */}
        <TabsContent value="sales" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Revenue" value={formatCurrency(totalRevenue)} />
            <Stat label="Transactions" value={String(txnCount)} />
            <Stat label="Avg Order Value" value={formatCurrency(aov)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-4">
              <p className="text-sm font-semibold mb-3">Sales Trend</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={Math.max(0, Math.floor(trend.length / 8))} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3">By Payment Method</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {byMethod.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-3 border-b flex items-center justify-between">
              <p className="font-semibold text-sm">Top Products</p>
              <Button size="sm" variant="outline" onClick={exportSales}>
                <Download className="h-3.5 w-3.5 mr-2" />Export Sales CSV
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
                {topProducts.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No sales in range.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Total Stock Value" value={formatCurrency(stockValue)} />
            <Stat label="Low Stock Items" value={String(lowStock.length)} />
            <Stat label="Dead Stock (90d)" value={String(deadStock.length)} />
          </div>
          <Card>
            <div className="p-3 border-b font-semibold text-sm">Dead Stock — no sales in 90 days</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Tied-up Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{productDisplayName(p)}</TableCell>
                    <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                    <TableCell className="text-right">{p.stock} {p.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.stock * p.costPrice)}</TableCell>
                  </TableRow>
                ))}
                {deadStock.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No dead stock.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          <Card>
            <div className="p-3 border-b font-semibold text-sm">Low Stock</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{productDisplayName(p)}</TableCell>
                    <TableCell className="text-right text-warning font-semibold">{p.stock}</TableCell>
                    <TableCell className="text-right">{p.minStock}</TableCell>
                  </TableRow>
                ))}
                {lowStock.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No low stock alerts.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* P&L */}
        {/* VALUATION */}
        <TabsContent value="valuation" className="space-y-4 mt-4">
          <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Costing Method</label>
              <Select value={valMethod} onValueChange={(v) => setValMethod(v as ValuationMethod)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest Cost</SelectItem>
                  <SelectItem value="average">Weighted Average</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={exportValuation}>
              <Download className="h-3.5 w-3.5 mr-2" />Export Valuation CSV
            </Button>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Total Inventory Value" value={formatCurrency(valuationTotal)} tone="accent" />
            <Stat label="Active Products" value={String(valuationRows.length)} />
            <Stat label="Categories" value={String(valuationByCategory.length)} />
          </div>

          <Card>
            <div className="p-3 border-b font-semibold text-sm">By Category</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuationByCategory.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                    <TableCell className="text-right">{c.products}</TableCell>
                    <TableCell className="text-right">{c.stock}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(c.value)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {valuationTotal > 0 ? ((c.value / valuationTotal) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                  </TableRow>
                ))}
                {valuationByCategory.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active products.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <div className="p-3 border-b font-semibold text-sm">Per Product</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuationRows
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 50)
                  .map((r) => (
                    <TableRow key={r.productId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="secondary">{r.category}</Badge></TableCell>
                      <TableCell className="text-right">{r.stock}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.unitCost)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.value)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            {valuationRows.length > 50 && (
              <div className="p-2 text-center text-xs text-muted-foreground border-t">
                Showing top 50 by value. Export CSV for full list.
              </div>
            )}
          </Card>
        </TabsContent>

        {/* P&L */}
        <TabsContent value="pl" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Stat label="Revenue" value={formatCurrency(totalRevenue)} />
            <Stat label="Cost of Goods Sold" value={formatCurrency(cogs)} tone="warning" />
            <Stat label="Gross Profit" value={formatCurrency(grossProfit)} tone="accent" />
            <Stat label="Net Profit" value={formatCurrency(netProfit)} tone={netProfit >= 0 ? "accent" : "destructive"} />
          </div>
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3">Revenue vs COGS vs Expenses</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Revenue", value: totalRevenue },
                  { name: "COGS", value: cogs },
                  { name: "Expenses", value: expenseTotal },
                  { name: "Net Profit", value: netProfit },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <div className="p-3 border-b font-semibold text-sm">Expenses in range</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(
                  (filteredExpenses as any[]).reduce((acc: Record<string, { total: number; count: number }>, e: any) => {
                    if (!acc[e.category]) acc[e.category] = { total: 0, count: 0 };
                    acc[e.category].total += e.amount;
                    acc[e.category].count += 1;
                    return acc;
                  }, {})
                ).map(([cat, info]: [string, { total: number; count: number }]) => (
                  <TableRow key={cat}>
                    <TableCell><Badge variant="secondary">{cat}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(info.total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{info.count}</TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No expenses in range.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "accent" | "destructive" }) {
  const cls = tone === "warning" ? "text-warning" : tone === "accent" ? "text-accent" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls}`}>{value}</p>
    </Card>
  );
}
