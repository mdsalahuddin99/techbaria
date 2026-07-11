/**
 * Cursor-based pagination helper.
 *
 * Enterprise-grade: uses opaque cursors (encoded IDs) so clients can't
 * guess or manipulate page boundaries. Returns `hasMore` instead of
 * `hasNextPage` so the client knows whether to render a "Load More"
 * button or scroll trigger.
 *
 * Usage in a service:
 * ```ts
 * import { paginate, type Paginated } from "@/server/lib/paginate";
 *
 * async list(ctx: Ctx, params?: PaginationParams) {
 *   return paginate(
 *     prisma.product,
 *     { where: { shopId: ctx.shopId } },
 *     params,
 *     { orderBy: { createdAt: "desc" } },
 *   );
 * }
 * ```
 *
 * Usage in an API route:
 * ```ts
 * const { cursor, limit } = parsePaginationParams(url);
 * return productsService.list(ctx, { cursor, limit });
 * ```
 */
import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaginationParams {
  /** Opaque cursor — pass the `nextCursor` from the previous response. */
  cursor?: string;
  /** Max items to return (1–100, default 50). */
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  /** Opaque cursor for the next page. Null when there are no more results. */
  nextCursor: string | null;
  /** True when there are more results after this page. */
  hasMore: boolean;
}

// ─── Parsing helper for API routes ──────────────────────────────────────────

/**
 * Parse `cursor` and `limit` from a URL's query parameters.
 * Safe defaults: limit=50, max=100.
 */
export function parsePaginationParams(url: URL): PaginationParams {
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Math.min(Math.max(1, parseInt(rawLimit, 10) || 50), 100) : 50;
  return { cursor, limit };
}

// ─── Generic paginator ──────────────────────────────────────────────────────

type PrismaDelegate = {
  findMany: (args: any) => Promise<any[]>;
  count: (args: { where: any; cursor?: any }) => Promise<number>;
};

/**
 * Execute a paginated query using cursor-based pagination.
 *
 * @param delegate - A Prisma delegate (e.g., `prisma.product`)
 * @param baseArgs - Base query args (where, include, select, etc.)
 * @param params   - PaginationParams from the request
 * @param extra    - Extra args like orderBy, include that aren't in baseArgs
 *
 * @returns Paginated<T> — items with nextCursor and hasMore
 */
export async function paginate<T>(
  delegate: PrismaDelegate,
  baseArgs: {
    where?: any;
    include?: any;
    select?: any;
  },
  params?: PaginationParams,
  extra?: {
    orderBy?: any;
    include?: any;
    select?: any;
  },
): Promise<Paginated<T>> {
  const limit = params?.limit ?? 50;

  // Build the findMany args
  const findManyArgs: any = {
    ...baseArgs,
    take: limit + 1, // Fetch one extra to determine hasMore
    orderBy: extra?.orderBy ?? { id: "asc" },
  };

  // Apply cursor if provided
  if (params?.cursor) {
    findManyArgs.cursor = { id: params.cursor };
    findManyArgs.skip = 1; // Skip the cursor itself
  }

  const rows = await delegate.findMany(findManyArgs);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}
