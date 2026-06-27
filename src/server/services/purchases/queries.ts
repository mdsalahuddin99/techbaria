import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { serializePurchase } from "@/server/lib/serialize";
import { cache, cacheKeys, TTL } from "@/lib/cache";

import type { PurchaseListFilter } from "./types";

/** Shared query logic for the purchases list — used both direct and cached. */
async function runPurchaseListQuery(ctx: Ctx, params?: PaginationParams, filter?: PurchaseListFilter) {
  const where: any = {};
  
  if (filter?.search) {
    const q = filter.search;
    where.OR = [
      { invoiceNo: { contains: q, mode: "insensitive" } },
      { supplier: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (filter?.status && filter.status !== "All") {
    // Status is stored in `notes` as JSON like {"_m":{"status":"Received"}}
    // This is hard to query natively in Prisma depending on DB.
    // Assuming we do a basic string search in notes.
    where.notes = { contains: filter.status, mode: "insensitive" };
  }

  let orderBy: any = { createdAt: "desc" };
  if (filter?.sortKey) {
    if (filter.sortKey === "date") orderBy = { createdAt: filter.sortDir || "desc" };
    else if (filter.sortKey === "total") orderBy = { total: filter.sortDir || "desc" };
    else if (filter.sortKey === "due") orderBy = { due: filter.sortDir || "desc" };
  }

  const raw = await paginate(
    prisma.purchase,
    {
      where,
      include: { items: true, tenders: true, supplier: true },
    },
    params,
    { orderBy },
  );
  return {
    items: raw.items.map(serializePurchase),
    nextCursor: raw.nextCursor,
    hasMore: raw.hasMore,
  };
}

/** List all purchases for the shop (paginated). */
export async function list(ctx: Ctx, params?: PaginationParams, filter?: PurchaseListFilter): Promise<Paginated<ReturnType<typeof serializePurchase>>> {
  requireRole(ctx, "ADMIN");
  const firstPage = !params?.cursor;
  if (firstPage) {
    return cache.fetch(cacheKeys.purchases.list("default"), TTL.PURCHASES_LIST, async () => {
      return runPurchaseListQuery(ctx, params, filter);
    });
  }
  return runPurchaseListQuery(ctx, params, filter);
}

/** Get a single purchase by ID. */
export async function getById(ctx: Ctx, id: string) {
  requireRole(ctx, "ADMIN");
  const raw = await prisma.purchase.findFirst({
    where: { id },
    include: {
      items: { include: { product: true } },
      tenders: true,
      supplier: true,
    },
  });
  if (!raw) throw new ServiceError("NOT_FOUND", "Purchase not found", 404);
  return serializePurchase(raw);
}

/** List purchases by supplier (up to last 20 POs). Requires MANAGER+. */
export async function listBySupplier(ctx: Ctx, supplierId: string): Promise<ReturnType<typeof serializePurchase>[]> {
  requireRole(ctx, "ADMIN");
  const raw = await prisma.purchase.findMany({
    where: { supplierId },
    include: { items: true, tenders: true, supplier: true },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  });
  return raw.map(serializePurchase);
}
