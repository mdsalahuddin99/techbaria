"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/lib/format";
import { History, User, Phone, Mail, FileText, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api-client/fetch";
import { Button } from "@/shared/ui/button";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance?: number;
  due?: number;
  group?: string;
}

interface CustomerSidebarProps {
  customers: Customer[];
  customerId: string | null;
  onCustomerChange: (id: string | null) => void;
}

export function CustomerSidebar({
  customers,
  customerId,
  onCustomerChange,
}: CustomerSidebarProps) {
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const walletBalance = Math.max(0, Number(customer?.balance ?? 0));
  const dueBalance = Math.max(0, Number(customer?.due ?? 0));

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["customer-history", customerId],
    queryFn: () => apiFetch<any[]>(`/api/sales/by-customer?customerId=${customerId}`),
    enabled: !!customerId && customerId !== "walk-in",
  });

  return (
    <div className="bg-card rounded-md border border-slate-200 shadow-sm flex flex-col h-full sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          Customer Info
        </h3>
        <Select
          value={customerId ?? "walk-in"}
          onValueChange={(v) => onCustomerChange(v === "walk-in" ? null : v)}
        >
          <SelectTrigger className="h-10 bg-white border-slate-200 text-sm font-medium">
            <SelectValue placeholder="Walk-in Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="walk-in">Walk-in Customer</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` — ${c.phone}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Details */}
      {customer && (
        <div className="p-4 space-y-5 flex-1">
          {/* Avatar & Basic Info */}
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-800 truncate">
                {customer.name}
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {customer.group ? `Group: ${customer.group}` : "Retail Customer"}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {customer.phone && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Outstanding Dues
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-slate-600">Total Due</span>
                <span className="text-lg font-bold text-orange-600 tabular-nums">
                  {formatCurrency(dueBalance)}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-slate-600">Wallet / Advance</span>
                <span className="text-md font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(walletBalance)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
             <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Recent Invoices
            </h4>
            
            {historyLoading ? (
              <div className="text-xs text-slate-400">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-slate-400">No previous sales found.</div>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 3).map((h: any) => (
                  <li key={h.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded p-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{h.invoiceNo}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(h.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                       <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${h.dueAmount > 0 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {h.dueAmount > 0 ? "Due" : "Paid"}
                      </span>
                      <p className="text-xs font-bold text-slate-700 mt-1">
                        {formatCurrency(h.total)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {history.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 h-8 text-xs font-medium bg-white">
                    View All Invoices
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" side="right" className="w-80 p-0 overflow-hidden">
                  <div className="bg-muted px-3 py-2 border-b flex justify-between items-center">
                    <h4 className="text-sm font-semibold">Previous Sales</h4>
                    <span className="text-xs text-muted-foreground">{history.length} total</span>
                  </div>
                  <ul className="max-h-[300px] overflow-y-auto divide-y">
                    {history.map((h: any) => (
                      <li key={h.id} className="p-3 hover:bg-secondary/40 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-700">{h.invoiceNo}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            {h.items?.reduce((s: any, i: any) => s + i.qty, 0) || 0} items
                          </span>
                          <span className="font-medium text-slate-800">
                            {formatCurrency(h.total)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )}

      {!customer && (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <User className="h-10 w-10 mb-2 opacity-20" />
          <p className="text-sm">No customer selected</p>
          <p className="text-xs mt-1">Select a customer to view details</p>
        </div>
      )}
    </div>
  );
}
