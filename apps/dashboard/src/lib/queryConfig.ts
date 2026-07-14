/**
 * TanStack Query staleTime & cache configuration tiers.
 *
 * Each tier represents a data freshness guarantee. The closer data is to
 * financial transactions, the lower the staleTime.
 *
 * stickyTime (formerly gcTime) = how long inactive data is kept in memory.
 * This is set high so navigating back to a page is instant — no loading state.
 */
export const QueryTier = {
  /**
   * Financial transactions — 15s stale is acceptable for list views.
   * staleTime: 15s → navigation to sales/purchases page is instant
   * (shows cached data) while background refresh keeps it fresh.
   * refetchOnWindowFocus: true → returning to tab fetches latest.
   * Used by: sales, purchases, payments, refunds
   */
  TRANSACTION: {
    staleTime: 15_000,
    gcTime: 30 * 60_000, // 30 min in memory for back-nav
    refetchOnWindowFocus: true,
    refetchInterval: false,
  } as const,

  /**
   * Live inventory — slightly stale is OK but under 15s.
   * Used by: stock levels, adjustments, transfers
   */
  INVENTORY: {
    staleTime: 15_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000, // poll every 30s for near-real-time
  } as const,

  /**
   * Master data — 1 minute stale is acceptable.
   * Used by: products, customers, suppliers, accounts
   */
  MASTER_DATA: {
    staleTime: 30_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  } as const,

  /**
   * Reference data — changes rarely.
   * staleTime: 5 min → almost always served from cache.
   * Used by: categories, brands, units, tax rates
   */
  REFERENCE: {
    staleTime: 5 * 60_000,
    gcTime: 2 * 60 * 60_000, // 2 hours in memory
    refetchOnWindowFocus: false,
    refetchInterval: false,
  } as const,

  /**
   * Dashboard / Reports — heavy queries that don't need instant freshness.
   * staleTime: 30 min → stale is fine, users can manually refresh.
   * Used by: dashboard KPIs, sales reports, expense summaries
   */
  REPORT: {
    staleTime: 30 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  } as const,

  /**
   * User/session data — must be fresh on every page.
   * staleTime: 0 → always fetch on mount.
   * Used by: auth session, user profile, shop settings
   */
  SESSION: {
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  } as const,
} as const;

/**
 * Type helper for query options — makes hook signatures cleaner.
 * Usage:
 * ```ts
 * import { QueryTier } from "@/lib/queryConfig";
 * return useQuery({
 *   queryKey: productKeys.list(),
 *   queryFn: () => productsService.list(),
 *   ...QueryTier.MASTER_DATA,
 *   enabled: !!session,
 * });
 * ```
 */
export type QueryTierConfig = (typeof QueryTier)[keyof typeof QueryTier];
