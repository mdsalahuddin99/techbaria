import { useEffect } from "react";

/**
 * Cache bridge is now a no-op. Data comes from the API client (fetch → app/api/*),
 * not from Zustand. The old Zustand bridge is preserved as a reference
 * in case a hybrid mode is needed later.
 *
 * This hook is still exported and called from AppProviders — it simply
 * does nothing, keeping the old mount site operational without changes.
 */
export function useProductsCacheBridge() {
  useEffect(() => {
    // No-op: API client handles caching via TanStack Query
  }, []);
}
