import { useEffect, useState } from "react";
import { offlineQueue, type OfflineOp } from "@/shared/lib/offline-queue";

export type SyncStatus = "online" | "offline" | "syncing";

/**
 * Live online + outbox state.
 *
 * - Tracks browser online/offline events
 * - Subscribes to the offline queue for pending op count
 * - Auto-flushes the queue when the network comes back
 */
export function useOnlineSync() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState<OfflineOp[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const up = async () => {
      setOnline(true);
      setSyncing(true);
      try {
        await offlineQueue.flush();
      } finally {
        setSyncing(false);
      }
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const unsub = offlineQueue.subscribe(setPending);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      unsub();
    };
  }, []);

  const flushNow = async () => {
    setSyncing(true);
    try {
      await offlineQueue.flush();
    } finally {
      setSyncing(false);
    }
  };

  const status: SyncStatus = !online ? "offline" : syncing ? "syncing" : "online";
  return { online, syncing, pending, status, flushNow };
}
