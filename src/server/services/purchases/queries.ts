import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { serializePurchase } from "@/server/lib/serialize";
import { cache, cacheKeys, TTL } from "@/lib/cache";

/** Shared query logic for the purchases list — used both direct and cached. */
async function runPurchaseListQuery(ctx: Ctx, params?: PaginationParams) {
  const raw = await paginate(
    prisma.purchase,
    {
      include: { items: true, tenders: true, supplier: true },
    },
    params,
    { orderBy: { createdAt: "desc" as const } },
  );
  return {
    items: raw.items.map(serializePurchase),
    nextCursor: raw.nextCursor,
    hasMore: raw.hasMore,
  };
}

/** List all purchases for the shop (paginated). */
export async function list(ctx: Ctx, params?: PaginationParams): Promise<Paginated<ReturnType<typeof serializePurchase>>> {
  requireRole(ctx, "MANAGER");
  const firstPage = !params?.cursor;
  if (firstPage) {
    return cache.fetch(cacheKeys.purchases.list("default"), TTL.PURCHASES_LIST, async () => {
      return runPurchaseListQuery(ctx, params);
    });
  }
  return runPurchaseListQuery(ctx, params);
}

/** Get a single purchase by ID. */
export async function getById(ctx: Ctx, id: string) {
  requireRole(ctx, "MANAGER");
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
  requireRole(ctx, "MANAGER");
  const raw = await prisma.purchase.findMany({
    where: { supplierId },
    include: { items: true, tenders: true, supplier: true },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  });
  return raw.map(serializePurchase);
}
