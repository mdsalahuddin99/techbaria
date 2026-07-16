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
      <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-border/60 bg-gradient-to-r from-primary/[0.04] to-transparent">
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

      <div className="p-2 md:p-3">
        {/* KPI tiles */}
        <div className="flex flex-wrap justify-center lg:justify-between gap-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-border/60 bg-background/60 px-4 py-3 hover:shadow-sm transition flex items-center gap-3 w-fit min-w-[160px]"
            >
              <div className={cn("h-5 w-5 rounded flex-shrink-0 grid place-items-center", t.tone)}>
                <t.icon className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                  {t.label}
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-sm font-bold tracking-tight tabular-nums leading-none">
                    {t.value}
                  </p>
                  {t.sub && (
                    <p className="text-[9px] text-muted-foreground leading-none">{t.sub}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        </div>
    </section>
  );
}
