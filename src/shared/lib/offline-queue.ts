/**
 * Offline outbox queue.
 *
 * Mutations performed while the device is offline are queued here and
 * automatically flushed once the browser reports `online`. The queue
 * is persisted to localStorage so it survives reloads / app restarts.
 *
 * Today the project's services are local-only (Zustand + localStorage)
 * so the "sync" step is a no-op success — but the API is shaped so a
 * real HTTP backend can plug in by registering a syncer for each op
 * kind via `registerSyncer`.
 */

export type OfflineOpKind = "sale.created" | "sale.voided" | "sale.refunded";

export interface OfflineOp<T = unknown> {
  id: string;
  kind: OfflineOpKind;
  payload: T;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const QUEUE_KEY = "offline:outbox:v1";
const LISTENERS = new Set<(ops: OfflineOp[]) => void>();

type Syncer = (op: OfflineOp) => Promise<void>;
const syncers = new Map<OfflineOpKind, Syncer>();

// Default syncer: succeed instantly. Replace per-kind via registerSyncer
// when a real backend exists.
const defaultSyncer: Syncer = async () => {};

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(): OfflineOp[] {
  const ls = safeStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOp[]) : [];
  } catch {
    return [];
  }
}

function write(ops: OfflineOp[]) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(QUEUE_KEY, JSON.stringify(ops));
  } catch {
    /* quota */
  }
  LISTENERS.forEach((fn) => fn(ops));
}

function genId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `op_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const offlineQueue = {
  list(): OfflineOp[] {
    return read();
  },
  enqueue<T>(kind: OfflineOpKind, payload: T): OfflineOp<T> {
    const op: OfflineOp<T> = {
      id: genId(),
      kind,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    write([...read(), op as OfflineOp]);
    // Try to flush immediately if online; harmless if not.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void offlineQueue.flush();
    }
    return op;
  },
  remove(id: string) {
    write(read().filter((o) => o.id !== id));
  },
  clear() {
    write([]);
  },
  subscribe(fn: (ops: OfflineOp[]) => void): () => void {
    LISTENERS.add(fn);
    fn(read());
    return () => LISTENERS.delete(fn);
  },
  /**
   * Try to flush every pending op. Returns the count of remaining ops
   * after the flush attempt. Failures are recorded back to the queue
   * with attempts++ so a future flush can retry.
   */
  async flush(): Promise<number> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return read().length;
    }
    const queue = read();
    const remaining: OfflineOp[] = [];
    for (const op of queue) {
      const syncer = syncers.get(op.kind) ?? defaultSyncer;
      try {
        await syncer(op);
      } catch (err) {
        remaining.push({
          ...op,
          attempts: op.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        });
      }
    }
    write(remaining);
    return remaining.length;
  },
};

export function registerSyncer(kind: OfflineOpKind, syncer: Syncer) {
  syncers.set(kind, syncer);
}
