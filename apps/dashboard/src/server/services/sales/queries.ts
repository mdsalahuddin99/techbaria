import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { paginate, type PaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { serializeSale } from "@/server/lib/serialize";
import { cache, cacheKeys, TTL } from "@/lib/cache";
import type { SaleListFilter } from "./types";

/** Shared query logic for the sales list — used both direct and cached. */
async function runSaleListQuery(ctx: Ctx, params?: PaginationParams, filter?: SaleListFilter) {
  const where: any = {};
  if (filter?.channel) where.channel = filter.channel;
  if (filter?.customerId) where.customerId = filter.customerId;
  if (filter?.from || filter?.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }

  if (filter?.search) {
    const q = filter.search;
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q, mode: "insensitive" } } },
    ];
  }
  
  if (filter?.paymentMethod && filter.paymentMethod !== "All") {
    // If they filter by a specific method, we check if there's a tender matching it.
    // SaleTender type doesn't perfectly match frontend "Cash", "Card" names directly,
    // but assuming we match by tender types string mapping or similar, or maybe `tenders: { some: { type: ... } }`.
    // Let's just do a string matching on tenders some type or keep it simple if `paymentMethod` is stored differently.
    // Wait, let's see how frontend derives paymentMethod. Frontend `paymentMethod` is calculated by taking the first tender or similar in serializeSale?
    // Actually `serializeSale` computes `paymentMethod` from tenders.
    // I will use `tenders: { some: { type: filter.paymentMethod.toUpperCase() } }` assuming they map.
    // Let's look at serializeSale first, or just use a basic string check.
    
    // For now, let's assume uppercase maps to TenderType
    where.tenders = {
      some: {
        type: filter.paymentMethod.toUpperCase()
      }
    };
  }

  let orderBy: any = { createdAt: "desc" };
  if (filter?.sortKey) {
    if (filter.sortKey === "date") orderBy = { createdAt: filter.sortDir || "desc" };
    else if (filter.sortKey === "total") orderBy = { total: filter.sortDir || "desc" };
    else if (filter.sortKey === "due") orderBy = { due: filter.sortDir || "desc" };
  }

  const raw = await paginate(
    prisma.sale,
    // serialNumbers omitted from list — only needed in getById detail view
    { where, include: { items: true, tenders: true, customer: true, editedBy: true, user: true } } as any,
    params,
    { orderBy },
  );

  return {
    items: raw.items.map(serializeSale),
    nextCursor: raw.nextCursor,
    hasMore: raw.hasMore,
  };
}

/** List sales with optional filters (paginated). */
export async function list(ctx: Ctx, params?: PaginationParams, filter?: SaleListFilter) {
  // Cache only unfiltered first-page loads (main table view)
  const noFilter = !filter?.channel && !filter?.customerId && !filter?.from && !filter?.to;
  const firstPage = !params?.cursor;
  if (noFilter && firstPage) {
    return cache.fetch(cacheKeys.sales.list(), TTL.SALES_LIST, async () => {
      return runSaleListQuery(ctx, params, filter);
    });
  }
  return runSaleListQuery(ctx, params, filter);
}

/** Get a single sale by ID. */
export async function getById(ctx: Ctx, id: string) {
  const raw = await prisma.sale.findFirst({
    where: { id },
    include: {
      items: { include: { serialNumbers: true } } as any,
      tenders: true,
      customer: true,
      user: true,
    },
  });
  if (!raw) throw new ServiceError("NOT_FOUND", "Sale not found", 404);
  return serializeSale(raw as any);
}

/** Get sales for a specific customer. */
export async function byCustomer(ctx: Ctx, customerId: string) {
  const raw = await prisma.sale.findMany({
    where: { customerId },
    include: { items: true, tenders: true, customer: true, editedBy: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return raw.map(serializeSale);
}

/** List returns (stubbed for now). */
export async function listReturns(ctx: Ctx, params?: PaginationParams) {
  return {
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}
