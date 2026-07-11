"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Cloud, CloudAlert } from "lucide-react";
import { useOnlineSync } from "@/shared/hooks/use-online-sync";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Floating status pill: shows offline state, pending sync count, and
 * a manual "Sync now" trigger. Mounted globally in AppLayout.
 *
 * ⚠️ Hydration guard — only renders after mount so server HTML always matches
 * client (Zustand persist can return different values on server vs. browser).
 */
export default function OfflineIndicator() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { status, pending, flushNow } = useOnlineSync();

  // SSR hydration guard + hide when fully online and nothing pending.
  if (!mounted || (status === "online" && pending.length === 0)) return null;

  const tone =
    status === "offline"
      ? "bg-warning text-warning-foreground"
      : pending.length > 0
        ? "bg-secondary text-secondary-foreground"
        : "bg-primary text-primary-foreground";

  const Icon =
    status === "offline" ? CloudOff : status === "syncing" ? RefreshCw : pending.length > 0 ? CloudAlert : Cloud;

  const label =
    status === "offline"
      ? `Offline${pending.length ? ` · ${pending.length} pending` : ""}`
      : status === "syncing"
        ? `Syncing${pending.length ? ` · ${pending.length}` : ""}…`
        : `${pending.length} pending sync`;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-elegant animate-in fade-in slide-in-from-bottom-2",
        tone
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
      <span>{label}</span>
      {status !== "offline" && pending.length > 0 ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs hover:bg-background/20"
          onClick={flushNow}
        >
          Sync now
        </Button>
      ) : null}
    </div>
  );
}
