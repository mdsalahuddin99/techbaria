"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo } from "react";
import Link from "next/link";
import { usePosStore } from "@/store/usePosStore";
import { useProductsQuery } from "@/features/products/hooks";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import {
  Bell, AlertTriangle, ShoppingCart, PackageCheck, Wallet, Info, CheckCheck, Trash2,
} from "lucide-react";
import { AppNotification } from "@/shared/lib/types";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/shared/components";
import {
  useNotifications, useNotificationActions, useUnreadCount,
} from "@/features/notifications/hooks";
import { Product } from "@/features/products/types";

const iconFor = (t: AppNotification["type"]) => {
  switch (t) {
    case "low_stock": return AlertTriangle;
    case "sale": return ShoppingCart;
    case "purchase_received": return PackageCheck;
    case "payment": return Wallet;
    default: return Info;
  }
};

const toneFor = (t: AppNotification["type"]) => {
  switch (t) {
    case "low_stock": return "bg-warning/10 text-warning";
    case "sale": return "bg-primary/10 text-primary";
    case "purchase_received": return "bg-accent/10 text-accent";
    case "payment": return "bg-accent/10 text-accent";
    default: return "bg-secondary text-muted-foreground";
  }
};

export function NotificationsClient() {
  usePageTitle("Notifications");
  const products = (useProductsQuery().data?.items ?? []) as Product[];
  const notifications = useNotifications();
  const { push: pushNotification, markRead: markNotificationRead, markAllRead: markAllNotificationsRead, clear: clearNotifications } = useNotificationActions();
  const unread = useUnreadCount();

  // Live derived: low-stock products that don't yet have an unread notification
  const liveLowStock = useMemo(
    () => products.filter((p) => p.stock <= p.minStock && p.active),
    [products]
  );

  const seedLowStock = () => {
    let added = 0;
    liveLowStock.forEach((p) => {
      const exists = notifications.some(
        (n) => n.type === "low_stock" && n.message.includes(p.name) && !n.read
      );
      if (!exists) {
        pushNotification({
          type: "low_stock",
          title: "Low stock alert",
          message: `${p.name} is at ${p.stock} ${p.unit} (min ${p.minStock})`,
          link: "/inventory",
        });
        added++;
      }
    });
    if (added) toast.success(`${added} low-stock alert${added > 1 ? "s" : ""} added`);
    else toast.info("All low-stock items already alerted");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="System alerts for low stock, sales, payments and more."
      />
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Notifications</p>
            <p className="text-2xl font-bold">{notifications.length}<span className="text-sm font-normal text-muted-foreground ml-2">{unread} unread</span></p>
          </div>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={seedLowStock}>
            <AlertTriangle className="h-4 w-4 mr-2" />Scan Low Stock
          </Button>
          <Button variant="outline" size="sm" onClick={() => { markAllNotificationsRead(); toast.success("Marked all as read"); }}>
            <CheckCheck className="h-4 w-4 mr-2" />Mark all read
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => { clearNotifications(); toast.success("Cleared"); }}>
            <Trash2 className="h-4 w-4 mr-2" />Clear all
          </Button>
        </div>
      </Card>

      <Card className="divide-y">
        {notifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="Activity from sales, restocks, and low-stock will appear here."
          />
        )}
        {notifications.map((n) => {
          const Icon = iconFor(n.type);
          return (
            <div
              key={n.id}
              className={`p-4 flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${toneFor(n.type)}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.read && <Badge className="bg-primary text-primary-foreground text-[10px] py-0">NEW</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.date)}</p>
              </div>
              <div className="flex flex-col gap-1">
                {n.link && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={n.link}>View</Link>
                  </Button>
                )}
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markNotificationRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
