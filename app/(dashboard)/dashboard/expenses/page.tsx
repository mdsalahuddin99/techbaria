"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { Plus, Pencil, Trash2, Wallet, Search, Receipt } from "lucide-react";
import { Expense, ExpenseCategory } from "@/shared/lib/types";
import { PageHeader, EmptyState, ConfirmDialog } from "@/shared/components";
import { useExpenses, useDeleteExpense } from "@/features/expenses/hooks";
import { ExpenseFormDialog } from "@/features/expenses/ExpenseFormDialog";

const CATEGORIES: ExpenseCategory[] = ["Rent", "Salary", "Utilities", "Transport", "Marketing", "Maintenance", "Other"];

export default function Expenses() {
  usePageTitle("Expenses");
  const { data: expenses } = useExpenses();
  const deleteMutation = useDeleteExpense();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return expenses.filter(
      (e) =>
        (filter === "All" || e.category === filter) &&
        e.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [expenses, search, filter]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const chartData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      if (key in months) months[key] += e.amount;
    });
    return Object.entries(months).map(([month, total]) => ({ month, total }));
  }, [expenses]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setOpen(true); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        description="Track operational costs and monthly spending."
        actions={
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">{formatCurrency(totalThisMonth)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Filtered Total</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-sm font-semibold mb-3">Monthly expenses (last 6 months)</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search description…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={expenses.length === 0 ? "No expenses recorded" : "No expenses match your filters"}
            description={expenses.length === 0 ? "Track your operational costs by adding an expense." : "Try changing the search or category."}
            action={expenses.length === 0 ? (
              <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />Add Expense
              </Button>
            ) : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                    <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.recordedBy}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label="Edit expense"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(e.id)} aria-label="Delete expense"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ExpenseFormDialog open={open} onOpenChange={setOpen} editing={editing} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this expense?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
