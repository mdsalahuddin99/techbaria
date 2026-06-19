"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { useAdminStorefrontOrders } from "@/features/storefront/hooks/useAdminOrders";
import type { StorefrontOrder } from "@/features/storefront/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { ShoppingBag, Search, Package, MapPin, Phone, Eye } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

const STATUS_FLOW: StorefrontOrder["status"][] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  shipped: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OnlineOrders() {
  usePageTitle("Online Orders");
  const { orders, updateStatus } = useAdminStorefrontOrders();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StorefrontOrder | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    STATUS_FLOW.forEach((s) => (c[s] = orders.filter((o) => o.status === s).length));
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? orders : orders.filter((o) => o.status === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(q) ||
          o.address.fullName.toLowerCase().includes(q) ||
          o.address.phone.includes(q),
      );
    }
    return list;
  }, [orders, tab, query]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 grid place-items-center text-primary-foreground shadow-elegant">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Online Orders</h1>
              <p className="text-sm text-muted-foreground">
                Manage your storefront orders end-to-end.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order #, customer, phone…"
                className="pl-8 h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1 flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              {t.label}
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {counts[t.value] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card p-12 text-center">
              <div className="h-12 w-12 mx-auto rounded-xl bg-muted grid place-items-center mb-3">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No orders found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {query ? "Try a different search." : "Orders will show here once placed."}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Order</th>
                      <th className="text-left font-medium px-4 py-3">Customer</th>
                      <th className="text-left font-medium px-4 py-3">Date</th>
                      <th className="text-left font-medium px-4 py-3">Payment</th>
                      <th className="text-right font-medium px-4 py-3">Total</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold">#{o.orderNo}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {o.items.length} item{o.items.length > 1 ? "s" : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{o.address.fullName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {o.address.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                          {formatDateTime(o.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="uppercase text-[10px]">
                            {o.paymentMethod}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatCurrency(o.total)}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={o.status}
                            onValueChange={(v) =>
                              updateStatus(o.id, v as StorefrontOrder["status"])
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-[130px] text-xs font-medium capitalize border",
                                statusTone[o.status],
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_FLOW.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => setSelected(o)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border/50">
                {filtered.map((o) => (
                  <div key={o.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold">#{o.orderNo}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {o.address.fullName} · {o.address.phone}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("capitalize text-[10px]", statusTone[o.status])}
                      >
                        {o.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">
                        {formatDateTime(o.createdAt)}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(o.total)}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Select
                        value={o.status}
                        onValueChange={(v) =>
                          updateStatus(o.id, v as StorefrontOrder["status"])
                        }
                      >
                        <SelectTrigger className="h-8 text-xs capitalize flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_FLOW.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setSelected(o)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Order #{selected.orderNo}
                  <Badge
                    variant="secondary"
                    className={cn("capitalize", statusTone[selected.status])}
                  >
                    {selected.status}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-5 text-sm">
                <section>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Customer
                  </h4>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
                    <div className="font-medium">{selected.address.fullName}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selected.address.phone}
                    </div>
                    <div className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        {selected.address.address}, {selected.address.area || ""}{" "}
                        {selected.address.city} {selected.address.postcode || ""}
                      </span>
                    </div>
                    {selected.address.notes && (
                      <div className="text-[11.5px] text-muted-foreground italic">
                        “{selected.address.notes}”
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Items
                  </h4>
                  <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                    {selected.items.map((l) => (
                      <div key={l.productId} className="flex items-center gap-3 p-2.5">
                        <div className="h-9 w-9 rounded-md bg-muted grid place-items-center text-base">
                          {l.emoji || "📦"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-medium truncate">{l.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {l.qty} × {formatCurrency(l.price)}
                          </div>
                        </div>
                        <div className="text-[12.5px] font-semibold tabular-nums">
                          {formatCurrency(l.qty * l.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 text-[12.5px]">
                  <Row label="Subtotal" value={formatCurrency(selected.subtotal)} />
                  <Row label="Shipping" value={formatCurrency(selected.shipping)} />
                  {selected.discount > 0 && (
                    <Row label="Discount" value={`- ${formatCurrency(selected.discount)}`} />
                  )}
                  <div className="border-t border-border/50 pt-1.5 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(selected.total)}</span>
                  </div>
                  <Row
                    label="Payment"
                    value={selected.paymentMethod.toUpperCase()}
                  />
                  <Row
                    label="Shipping method"
                    value={selected.shippingMethod.replace("_", " ")}
                  />
                </section>

                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Update status
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_FLOW.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          updateStatus(selected.id, s);
                          setSelected({ ...selected, status: s });
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-md border text-[11px] font-medium capitalize transition",
                          selected.status === s
                            ? statusTone[s]
                            : "border-border/60 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
