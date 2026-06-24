"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  ShoppingBag,
  PackageCheck,
  XCircle,
  Wallet,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import { useAdminStorefrontOrders } from "@/features/storefront/hooks/useAdminOrders";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  confirmed: "bg-sky-500/15 text-sky-700",
  shipped: "bg-violet-500/15 text-violet-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function StorefrontBlock() {
  const { orders } = useAdminStorefrontOrders();

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending");
    const confirmed = orders.filter((o) => o.status === "confirmed" || o.status === "shipped");
    const delivered = orders.filter((o) => o.status === "delivered");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const awaiting = orders.filter(
      (o) => o.status === "pending" || o.status === "confirmed",
    );
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.total, 0);
    const cancelRate = orders.length
      ? (cancelled.length / orders.length) * 100
      : 0;

    // last 7 days spark
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toDateString()] = 0;
    }
    orders.forEach((o) => {
      const key = new Date(o.createdAt).toDateString();
      if (key in buckets && o.status !== "cancelled") buckets[key] += o.total;
    });
    const spark = Object.entries(buckets).map(([d, total]) => ({ d, total }));

    return { pending, confirmed, delivered, cancelled, awaiting, revenue, cancelRate, spark };
  }, [orders]);

  const recent = orders.slice(0, 5);

  const tiles = [
    {
      label: "New orders",
      value: stats.pending.length,
      icon: ShoppingBag,
      tone: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Confirmed / Shipped",
      value: stats.confirmed.length,
      icon: PackageCheck,
      tone: "bg-sky-500/10 text-sky-600",
    },
    {
      label: "Cancelled",
      value: stats.cancelled.length,
      sub: `${stats.cancelRate.toFixed(0)}% rate`,
      icon: XCircle,
      tone: "bg-destructive/10 text-destructive",
    },
    {
      label: "Online revenue",
      value: formatCurrency(stats.revenue),
      icon: Wallet,
      tone: "bg-emerald-500/10 text-emerald-600",
      wide: true,
    },
    {
      label: "Awaiting fulfilment",
      value: stats.awaiting.length,
      icon: Truck,
      tone: "bg-primary/10 text-primary",
    },
  ];

  return (
    <section className="rounded-2xl border border-border/70 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 grid place-items-center text-primary-foreground">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Storefront — Online</h3>
            <p className="text-[11px] text-muted-foreground">E-commerce channel overview</p>
          </div>
        </div>
        <Link href="/dashboard/online-orders" className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5">Manage orders <ArrowUpRight className="h-3 w-3" /></Link>
      </div>

      <div className="p-4 md:p-5 grid gap-4 md:grid-cols-5">
        {/* KPI tiles */}
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {tiles.map((t) => (
            <div
              key={t.label}
              className={cn(
                "rounded-xl border border-border/60 bg-background/60 p-3 hover:shadow-sm transition",
                t.wide && "sm:col-span-2",
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("h-7 w-7 rounded-md grid place-items-center", t.tone)}>
                  <t.icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mt-2">
                {t.label}
              </p>
              <p className="text-lg font-bold tracking-tight tabular-nums mt-0.5">
                {t.value}
              </p>
              {t.sub && (
                <p className="text-[10.5px] text-muted-foreground mt-0.5">{t.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Sparkline + recent */}
        <div className="md:col-span-2 rounded-xl border border-border/60 bg-background/60 p-3 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Last 7 days
            </p>
            <Badge variant="secondary" className="text-[9px]">7D</Badge>
          </div>
          <div className="hidden h-14 -mx-1 md:block">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.spark}>
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.75}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 border-t border-border/50 pt-2 space-y-1.5 flex-1">
            {recent.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-3">
                No online orders yet.
              </p>
            ) : (
              recent.map((o) => (
                <Link href="/dashboard/online-orders" key={o.id} className="flex items-center justify-between gap-2 text-[11.5px] hover:bg-muted/40 rounded-md px-2 py-1.5 transition">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">#{o.orderNo}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {formatDateTime(o.createdAt)}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("text-[9px] px-1.5 py-0 h-4", statusTone[o.status])}
                  >
                    {o.status}
                  </Badge>
                  <span className="tabular-nums font-semibold shrink-0">
                    {formatCurrency(o.total)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
