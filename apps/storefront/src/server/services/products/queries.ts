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
  if (filter?.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: filter.categoryId } });
    if (cat) {
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { categoryId: cat.id },
          { subcategory: { equals: cat.name, mode: "insensitive" as const } }
        ]
      });
    } else {
      where.categoryId = filter.categoryId;
    }
  }
  if (filter?.lowStock) where.stock = { lte: prisma.product.fields.reorderLevel };
  if (filter?.search) {
    const q = filter.search.trim();
    if (!where.AND) where.AND = [];
    const terms = q.split(/\s+/).filter(Boolean);

    // [SUPERFAST PATH] Pre-fetch relation IDs to avoid massive JOINs in the main query
    const [matchingModels, matchingBrands, matchingSerials] = await Promise.all([
      prisma.model.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true }, take: 20 }),
      prisma.brand.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true }, take: 20 }),
      prisma.serialNumber.findMany({ where: { serial: { equals: q, mode: "insensitive" } }, select: { productId: true }, take: 10 })
    ]);

    const modelIds = matchingModels.map(m => m.id);
    const brandIds = matchingBrands.map(b => b.id);
    const productIdsBySerial = matchingSerials.map(s => s.productId);

    where.AND.push({
      OR: [
        { AND: terms.map(term => ({ name: { contains: term, mode: "insensitive" as const } })) },
        { sku: { contains: q, mode: "insensitive" as const } },
        { barcode: { equals: q, mode: "insensitive" as const } },
        ...(modelIds.length > 0 ? [{ globalModelId: { in: modelIds } }] : []),
        ...(brandIds.length > 0 ? [{ globalBrandId: { in: brandIds } }] : []),
        ...(productIdsBySerial.length > 0 ? [{ id: { in: productIdsBySerial } }] : [])
      ]
    });
  }

  const result = await paginate<any>(
    prisma.product,
    {
      where,
      include: {
        category: true,
        images: { orderBy: { position: "asc" as const } },
        // Include IN_STOCK serialNumbers so POS can select them
        serialNumbers: { where: { status: "IN_STOCK" } },
        globalBrand: true,
        globalModel: true,
        globalSeries: true,
        warehouseStocks: true,
      },
    },
    params,
    { orderBy: [{ name: "asc" as const }, { id: "asc" as const }] },
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
    const limitSuffix = params?.limit ? `:${params.limit}` : "";
    return cache.fetch(`${cacheKeys.products.list()}${limitSuffix}`, TTL.PRODUCT_LIST, async () => {
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
      globalBrand: true,
      globalModel: true,
      globalSeries: true,
      productType: true,
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
        globalBrand: true,
        globalModel: true,
        globalSeries: true,
        productType: true,
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
import { unstable_cache } from "next/cache";

export async function publicStorefrontList(
  filter?: {
    category?: string;   // category NAME (not ID)
    search?: string;
    excludeId?: string;
    limit?: number;
    page?: number;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    sort?: "popular" | "newest" | "price_low" | "price_high";
    inStockOnly?: boolean;
    onSaleOnly?: boolean;
  }
) {
  // Use a deterministic cache key based on the filter string
  const filterStr = filter ? JSON.stringify(filter) : "empty";
  const cacheKey = `products:storefront:list:${filterStr}`;

  // Cache all storefront queries for 5 minutes (300 seconds) natively via Next.js
  const cachedQuery = unstable_cache(
    async () => runPublicStorefrontQuery(filter),
    [cacheKey],
    { revalidate: 300, tags: ['products'] }
  );

  return cachedQuery();
}

async function runPublicStorefrontQuery(
  filter?: {
    category?: string;
    search?: string;
    excludeId?: string;
    limit?: number;
    page?: number;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    sort?: "popular" | "newest" | "price_low" | "price_high";
    inStockOnly?: boolean;
    onSaleOnly?: boolean;
  }
) {
  let categoryId: string | undefined = undefined;
  
  if (filter?.category) {
    const cat = await prisma.category.findFirst({
      where: { name: { equals: filter.category, mode: "insensitive" } },
      select: { id: true }
    });
    if (cat) categoryId = cat.id;
  }

  let orderBy: any = { name: "asc" };
  if (filter?.sort === "price_low") orderBy = { price: "asc" };
  else if (filter?.sort === "price_high") orderBy = { price: "desc" };
  else if (filter?.sort === "newest") orderBy = { id: "desc" };

  const limit = filter?.limit ?? 24;
  const page = filter?.page ?? 1;
  const skip = (page - 1) * limit;

  // Pre-fetch relation IDs for storefront search too
  let preModelIds: string[] = [];
  let preBrandIds: string[] = [];
  
  if (filter?.search) {
    const q = filter.search.trim();
    const [mModels, mBrands] = await Promise.all([
      prisma.model.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true }, take: 20 }),
      prisma.brand.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true }, take: 20 })
    ]);
    preModelIds = mModels.map(m => m.id);
    preBrandIds = mBrands.map(b => b.id);
  }

  const whereClause: any = {
    isPublished: true,
    ...(categoryId && { categoryId }),
    ...(filter?.search && (function() {
      const q = filter.search.trim();
      const terms = q.split(/\s+/).filter(Boolean);
      return {
        OR: [
          { AND: terms.map(term => ({ name: { contains: term, mode: "insensitive" as const } })) },
          { sku: { contains: q, mode: "insensitive" as const } },
          ...(preModelIds.length > 0 ? [{ globalModelId: { in: preModelIds } }] : []),
          ...(preBrandIds.length > 0 ? [{ globalBrandId: { in: preBrandIds } }] : [])
        ]
      };
    })()),
    ...(filter?.excludeId && { id: { not: filter.excludeId } }),
  };

  if (filter?.minPrice !== undefined || filter?.maxPrice !== undefined) {
    whereClause.price = {};
    if (filter.minPrice !== undefined) whereClause.price.gte = filter.minPrice;
    if (filter.maxPrice !== undefined) whereClause.price.lte = filter.maxPrice;
  }

  if (filter?.brands && filter.brands.length > 0) {
    whereClause.globalBrand = { name: { in: filter.brands, mode: "insensitive" } };
  }

  if (filter?.inStockOnly) {
    whereClause.stock = { gt: 0 };
  }

  const [rows, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
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
        shortDescription: true,
        condition: true,
        warrantyMonths: true,
        isTrending: true,
        isFlashDeal: true,
        compareAtPrice: true,
        category: { select: { name: true } } as any,
        images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } as any,
        globalBrand: { select: { name: true } } as any,
        globalModel: { select: { name: true } } as any,
      },
      orderBy,
      take: limit,
      skip,
    }),
    // Only count if it's a paginated request (not a limit-only request like homepage)
    filter?.page ? prisma.product.count({ where: whereClause }) : Promise.resolve(0)
  ]);

  return {
    items: serialiseStorefront(rows),
    total: totalCount
  };


}

/** Products where stock ≤ reorderLevel. */
export async function lowStock(ctx: Ctx) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Product" WHERE "stock" <= "reorderLevel" ORDER BY ("reorderLevel" - "stock") DESC LIMIT 100`
  );
}

/** Products where stock = 0. */
export async function outOfStock(ctx: Ctx) {
  return prisma.product.findMany({
    where: { stock: { lte: 0 } },
    orderBy: { name: "asc" },
    take: 100,
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
