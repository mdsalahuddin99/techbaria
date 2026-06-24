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
  /** Notification unread count — 30 s (changes on mark-read / new push) */
  UNREAD_COUNT: 30,
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
  notifications: {
    unreadCount: (shopId: string) => `shop:${shopId}:notifications:unreadCount`,
  },
} as const;

// ─── Cache service ──────────────────────────────────────────────────────────

const memoryCache = new Map<string, { value: any; expiresAt: number }>();

export const cache = {
  /** Get a value from cache. Checks memory L1 first, then Redis. */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const memEntry = memoryCache.get(key);
    if (memEntry) {
      if (memEntry.expiresAt > now) {
        return memEntry.value as T;
      }
      memoryCache.delete(key);
    }

    const r = getRedis();
    if (!r) return null;
    try {
      const val = (await r.get(key)) as T | null;
      if (val !== null && val !== undefined) {
        // Populate memory L1 cache with remaining TTL or default 5 mins
        memoryCache.set(key, { value: val, expiresAt: Date.now() + 60 * 1000 });
      }
      return val;
    } catch (err) {
      console.error("[cache] get error:", err);
      return null;
    }
  },

  /** Set a value with optional TTL (seconds). Default: 5 min. */
  async set(key: string, value: unknown, ttl: number = TTL.CATALOG): Promise<void> {
    const now = Date.now();
    memoryCache.set(key, { value, expiresAt: now + ttl * 1000 });

    const r = getRedis();
    if (!r) return;
    try {
      await r.set(key, value, { ex: ttl });
    } catch (err) {
      console.error("[cache] set error:", err);
    }
  },

  /** Delete a specific key. */
  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      memoryCache.delete(key);
    }

    const r = getRedis();
    if (!r) return;
    try {
      await r.del(...keys);
    } catch (err) {
      console.error("[cache] del error:", err);
    }
  },

  /**
   * Invalidate all keys matching a pattern.
   * Example: `cache.invalidate("shop:abc:products:*")`
   */
  async invalidate(pattern: string): Promise<void> {
    // Escape regex characters except asterisk, and convert asterisk to .*
    const regexStr = "^" + pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, ".*") + "$";
    const regex = new RegExp(regexStr);
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }

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
    const cached = await cache.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const value = await fn();
    await cache.set(key, value, ttl);
    return value;
  },

  /** Helper: invalidate all product caches for a shop. */
  invalidateProducts(shopId: string) {
    return cache.invalidate(`shop:${shopId}:products:*`);
  },

  /** Helper: invalidate specific product caches (by ID) and product list. */
  async invalidateSpecificProducts(shopId: string, productIds: string[]) {
    if (productIds.length === 0) return;

    const keys = [
      cacheKeys.products.list(shopId),
      ...productIds.map(productId => cacheKeys.products.byId(shopId, productId))
    ];
    await cache.del(...keys);
  },

  /** Helper: invalidate all category caches for a shop. */
  invalidateCategories(shopId: string) {
    return cache.del(
      cacheKeys.categories.list(shopId),
      cacheKeys.categories.tree(shopId)
    );
  },

  /** Helper: invalidate all sales caches for a shop. */
  invalidateSales(shopId: string) {
    return cache.del(cacheKeys.sales.list(shopId));
  },

  /** Helper: invalidate all purchases caches for a shop. */
  invalidatePurchases(shopId: string) {
    return cache.del(cacheKeys.purchases.list(shopId));
  },

  /** Helper: invalidate inventory caches for a shop. */
  invalidateInventory(shopId: string) {
    return cache.del(cacheKeys.inventory.snapshot(shopId));
  },

  /** Helper: invalidate shop config cache. */
  invalidateShopConfig(shopId: string) {
    return cache.del(cacheKeys.shop.config(shopId));
  },
};
