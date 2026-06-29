import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { cache, cacheKeys, TTL } from "@/lib/cache";
import { serialise, serialiseOne, serialiseStorefront } from "./serialiser";
import type { ProductListFilter } from "./types";

/** Shared query logic for the products list — used both direct and cached. */
async function runListQuery(ctx: Ctx, params?: PaginationParams, filter?: ProductListFilter) {
  const where: any = {};
  if (filter?.isPublished !== undefined) where.isPublished = filter.isPublished;
  if (filter?.categoryId) where.categoryId = filter.categoryId;
  if (filter?.lowStock) where.stock = { lte: prisma.product.fields.reorderLevel };
  if (filter?.search) {
    where.OR = [
      { name: { contains: filter.search, mode: "insensitive" as const } },
      { sku: { contains: filter.search, mode: "insensitive" as const } },
      { barcode: { contains: filter.search } },
      { serialNumbers: { some: { serial: { contains: filter.search, mode: "insensitive" as const } } } },
    ];
  }

  const result = await paginate<any>(
    prisma.product,
    {
      where,
      include: {
        category: true,
        images: { orderBy: { position: "asc" as const } },
        // serialNumbers omitted from list — only needed in getById detail view
        brand: true,
        model: true,
        series: true,
      },
    },
    params,
    { orderBy: { name: "asc" as const } },
  );

  return {
    ...result,
    items: serialise(result.items),
  };
}

/** List products with optional search, category filter & pagination. */
export async function list(
  ctx: Ctx,
  params?: PaginationParams,
  filter?: ProductListFilter,
  opts?: { skipCache?: boolean }
): Promise<Paginated<ReturnType<typeof serialiseOne>>> {
  // Cache only unfiltered first-page loads (main table view)
  const noSearch = !filter?.search && !filter?.categoryId && filter?.isPublished === undefined && !filter?.lowStock;
  const firstPage = !params?.cursor;
  if (noSearch && firstPage && !opts?.skipCache) {
    return cache.fetch(cacheKeys.products.list("default"), TTL.PRODUCT_LIST, async () => {
      return runListQuery(ctx, params, filter);
    });
  }
  return runListQuery(ctx, params, filter);
}

/** Get a single product by ID (scoped to shop). */
export async function getById(ctx: Ctx, id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: true,
      serialNumbers: {
        where: { status: "IN_STOCK" },
        select: {
          id: true,
          serial: true,
          purchaseItem: {
            select: {
              warrantyMonths: true,
              warrantyStartDate: true,
            },
          },
        },
      },
      brand: true,
      model: true,
      series: true,
    },
  });
  if (!product) throw new ServiceError("NOT_FOUND", "Product not found", 404);
  return serialise(product);
}

/** Get a product by slug (for storefront). */
export async function getBySlug(slug: string) {
  const cacheKey = `products:storefront:slug:${slug}`;
  return cache.fetch(cacheKey, TTL.CATALOG, async () => {
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
        brand: true,
        model: true,
        series: true,
      },
    });
    if (!product) throw new ServiceError("NOT_FOUND", "Product not found", 404);
    return serialiseStorefront(product);
  });
}

/** Backward-compat alias — routes that already call publicList keep working. */
export async function publicList(filter?: { categoryId?: string; search?: string }) {
  return publicStorefrontList({ search: filter?.search });
}

/**
 * Lean storefront product list — used by /api/storefront/products.
 * ─ Only public-safe fields (no cost, no supplierId, no wholesale price).
 * ─ category filter by NAME (not ID), excludeId for related queries, limit support.
 * ─ Drops `series` JOIN (not needed for listing).
 * ─ Caches the unfiltered result for 5 minutes.
 */
export async function publicStorefrontList(
  filter?: {
    category?: string;   // category NAME (not ID)
    search?: string;
    excludeId?: string;  // exclude a product from results (related queries)
    limit?: number;
  }
) {
  const isUnfiltered = !filter?.category && !filter?.search && !filter?.excludeId;

  if (isUnfiltered) {
    const cacheKey = `products:storefront:v2:unfiltered`;
    return cache.fetch(cacheKey, TTL.CATALOG, () => runPublicStorefrontQuery(filter));
  }

  // Cache related products query
  if (filter?.category && filter?.excludeId && !filter?.search) {
    const cacheKey = `products:storefront:related:${filter.category}:${filter.excludeId}`;
    return cache.fetch(cacheKey, TTL.CATALOG, () => runPublicStorefrontQuery(filter));
  }

  return runPublicStorefrontQuery(filter);
}

async function runPublicStorefrontQuery(
  filter?: { category?: string; search?: string; excludeId?: string; limit?: number }
) {
  let categoryId: string | undefined = undefined;
  
  if (filter?.category) {
    const cat = await prisma.category.findFirst({
      where: { name: { equals: filter.category, mode: "insensitive" } },
      select: { id: true }
    });
    if (cat) categoryId = cat.id;
  }

  const rows = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...(categoryId && { categoryId }),
      // Search filter
      ...(filter?.search && {
        OR: [
          { name: { contains: filter.search, mode: "insensitive" as const } },
          { sku: { contains: filter.search, mode: "insensitive" as const } },
          { brand: { name: { contains: filter.search, mode: "insensitive" as const } } },
        ],
      }),
      // Exclude specific product (for "related" queries on PDP)
      ...(filter?.excludeId && { id: { not: filter.excludeId } }),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      stock: true,
      emoji: true,
      subcategory: true,
      color: true,
      storage: true,
      ram: true,
      isPublished: true,
      sku: true,
      description: true,
      condition: true,
      warrantyMonths: true,
      isTrending: true,
      category: { select: { name: true } } as any,
      images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } as any,
      brand: { select: { name: true } } as any,
      model: { select: { name: true } } as any,
    },
    orderBy: { name: "asc" as const },
    ...(filter?.limit ? { take: filter.limit } : {}),
  });

  return serialiseStorefront(rows);
}

/** Products where stock ≤ reorderLevel. */
export async function lowStock(ctx: Ctx) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Product" WHERE "stock" <= "reorderLevel" ORDER BY ("reorderLevel" - "stock") DESC`
  );
}

/** Products where stock = 0. */
export async function outOfStock(ctx: Ctx) {
  return prisma.product.findMany({
    where: { stock: { lte: 0 } },
    orderBy: { name: "asc" },
  });
}

/** Distinct non-null values for a given text field across all shop products. */
export async function distinctFieldValues(ctx: Ctx, field: string, parent?: string): Promise<string[]> {
  // Whitelist allowed fields to prevent SQL injection
  const tableFields = ["brand", "model", "series", "color", "storage", "ram"];
  if (tableFields.includes(field)) {
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT DISTINCT "${field}" FROM "Product" WHERE "${field}" IS NOT NULL AND "${field}" != '' ORDER BY "${field}" ASC`
    );
    return rows.map((r) => String(r[field])).filter(Boolean);
  }

  // "subcategory" — query the Category table for children of a given parent
  if (field === "subcategory" && parent) {
    const cats = await prisma.category.findMany({
      where: {
        parent: { name: parent },
        name: { not: "" },
      },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return cats.map((c) => c.name).filter(Boolean);
  }

  // "category" — query the Category table for parent categories
  if (field === "category") {
    const cats = await prisma.category.findMany({
      where: {
        parentId: null,
        name: { not: "" },
      },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return cats.map((c) => c.name).filter(Boolean);
  }

  return [];
}
