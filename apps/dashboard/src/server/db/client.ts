/**
 * Prisma client singleton (HMR-safe).
 *
 * Uses Neon direct connection (no Prisma Accelerate — the Accelerate pooled URL
 * pointed to a different database that had no tables, causing all queries to
 * return "table does not exist" errors).
 *
 * In development Next.js hot-reloads modules, which would create a new
 * PrismaClient on every reload. We cache the instance on `globalThis`
 * to avoid exhausting database connections.
 */
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ─── Neon Keep-Alive ──────────────────────────────────────────────────────────
// Neon free-tier suspends after 5 min of inactivity.  This ping keeps the DB
// warm so the first query after a lull doesn't pay a 3-5 s cold-start penalty.
function pingDb() {
  prisma.$queryRaw`SELECT 1`.catch(() => {});
}

let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(pingDb, 3 * 60 * 1000);
  pingDb();
}

export function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

startKeepAlive();
