import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized React Query client with sensible defaults for a
 * desktop-first POS app. Per-query staleTime is set in each
 * feature hook using `QueryTier.*` from `@/lib/queryConfig`.
 *
 * Defaults here are safe fallbacks — individual hooks override them.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
