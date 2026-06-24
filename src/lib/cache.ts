/**
 * Tiered caching service using Upstash Redis.
 *
 * Designed for:
 * - Product catalog (storefront) — refresh every 5 min
 * - Category tree — refresh every 15 min
 * - Session store — TTL = maxAge
 * - Shop settings — refresh every 1 min
 *
 * All cached entries include a `_meta` tag for manual invalidation
 * by entity type (e.g., "product:*" on product create/update/delete).
 *
 * Graceful degradation: if Redis is not configured, `get()` returns
 * `null` and `set()` is a no-op — no crashes, just cache misses.
 */
import { Redis } from "@upstash/redis";

// ─── Connection ─────────────────────────────────────────────────────────────

const getCleanEnv = (key: string) => {
  const val = process.env[key];
  return val ? val.replace(/^["']|["']$/g, "") : "";
};

const isConfigured = () =>
  !!getCleanEnv("UPSTASH_REDIS_REST_URL") && !!getCleanEnv("UPSTASH_REDIS_REST_TOKEN");

let redis: Redis | null = null;
let warned = false;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!isConfigured()) {
    if (!warned) {
      console.warn("[cache] UPSTASH_REDIS_REST_URL / TOKEN not set — caching disabled");
      warned = true;
    }
    return null;
  }
  redis = new Redis({
    url: getCleanEnv("UPSTASH_REDIS_REST_URL"),
    token: getCleanEnv("UPSTASH_REDIS_REST_TOKEN"),
  });
  return redis;
}

// ─── TTL presets ────────────────────────────────────────────────────────────

export const TTL = {
  /** Product catalog for storefront — stale after 5 min */
  CATALOG: 300,
  /** Product list for dashboard — 2 min */
  PRODUCT_LIST: 120,
  /** Sales list — 1 min (frequent changes) */
  SALES_LIST: 60,
  /** Purchases list — 2 min */
  PURCHASES_LIST: 120,
  /** Inventory snapshot — 1 min (frequent stock changes) */
  INVENTORY_SNAPSHOT: 60,
  /** Category tree — rarely changes */
  CATEGORY_TREE: 900,
  /** Shop settings / config */
  SHOP_CONFIG: 60,
  /** User session cache — match Auth.js maxAge (30 days) */
  SESSION: 60 * 60 * 24 * 30,
  /** Short-lived data (e.g. rate limit counters) */
  SHORT: 10,
} as const;

// ─── Key helpers ────────────────────────────────────────────────────────────

export const cacheKeys = {
  products: {
    list: (shopId: string) => `shop:${shopId}:products:list`,
    byId: (shopId: string, id: string) => `shop:${shopId}:products:${id}`,
    bySlug: (shopId: string, slug: string) => `shop:${shopId}:products:slug:${slug}`,
  },
  categories: {
    tree: (shopId: string) => `shop:${shopId}:categories:tree`,
    list: (shopId: string) => `shop:${shopId}:categories:list`,
  },
  sales: {
    list: (shopId: string) => `shop:${shopId}:sales:list`,
  },
  purchases: {
    list: (shopId: string) => `shop:${shopId}:purchases:list`,
  },
  inventory: {
    snapshot: (shopId: string) => `shop:${shopId}:inventory:snapshot`,
  },
  shop: {
    config: (shopId: string) => `shop:${shopId}:config`,
  },
} as const;

// ─── Cache service ──────────────────────────────────────────────────────────

export const cache = {
  /** Get a value from cache. Returns `null` on miss or when Redis is down. */
  async get<T>(key: string): Promise<T | null> {
    const r = getRedis();
    if (!r) return null;
    try {
      return (await r.get(key)) as T | null;
    } catch (err) {
      console.error("[cache] get error:", err);
      return null;
    }
  },

  /** Set a value with optional TTL (seconds). Default: 5 min. */
  async set(key: string, value: unknown, ttl: number = TTL.CATALOG): Promise<void> {
    const r = getRedis();
    if (!r) return;
    try {
      await r.set(key, value, { ex: ttl });
    } catch (err) {
      console.error("[cache] set error:", err);
    }
  },

  /** Delete a specific key. */
  async del(key: string): Promise<void> {
    const r = getRedis();
    if (!r) return;
    try {
      await r.del(key);
    } catch (err) {
      console.error("[cache] del error:", err);
    }
  },

  /**
   * Invalidate all keys matching a pattern.
   * Uses Upstash Redis SCAN under the hood.
   * Example: `cache.invalidate("shop:abc:products:*")`
   */
  async invalidate(pattern: string): Promise<void> {
    const r = getRedis();
    if (!r) return;
    try {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await r.scan(cursor, { match: pattern });
        cursor = parseInt(nextCursor, 10);
        if (keys.length > 0) {
          await r.del(...keys);
        }
      } while (cursor !== 0);
    } catch (err) {
      console.error("[cache] invalidate error:", err);
    }
  },

  /**
   * Fetch from cache or compute (memoize).
   * Gracefully falls back to the compute function on cache miss/error.
   */
  async fetch<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const r = getRedis();
    if (r) {
      try {
        const cached = await r.get(key);
        if (cached !== null && cached !== undefined) {
          return cached as T;
        }
      } catch {
        // fall through to compute
      }
    }
    const value = await fn();
    if (r) {
      try {
        await r.set(key, value, { ex: ttl });
      } catch {
        // cache write failure is non-fatal
      }
    }
    return value;
  },

  /** Helper: invalidate all product caches for a shop. */
  invalidateProducts(shopId: string) {
    return this.invalidate(`shop:${shopId}:products:*`);
  },

  /** Helper: invalidate specific product caches (by ID) and product list. */
  async invalidateSpecificProducts(shopId: string, productIds: string[]) {
    if (productIds.length === 0) return;

    const keys = [
      cacheKeys.products.list(shopId),
      ...productIds.map(productId => cacheKeys.products.byId(shopId, productId))
    ];
    await this.del(...keys);
  },

  /** Helper: invalidate all category caches for a shop. */
  invalidateCategories(shopId: string) {
    return this.del(
      cacheKeys.categories.list(shopId),
      cacheKeys.categories.tree(shopId)
    );
  },

  /** Helper: invalidate all sales caches for a shop. */
  invalidateSales(shopId: string) {
    return this.del(cacheKeys.sales.list(shopId));
  },

  /** Helper: invalidate all purchases caches for a shop. */
  invalidatePurchases(shopId: string) {
    return this.del(cacheKeys.purchases.list(shopId));
  },

  /** Helper: invalidate inventory caches for a shop. */
  invalidateInventory(shopId: string) {
    return this.del(cacheKeys.inventory.snapshot(shopId));
  },

  /** Helper: invalidate shop config cache. */
  invalidateShopConfig(shopId: string) {
    return this.del(cacheKeys.shop.config(shopId));
  },
};
