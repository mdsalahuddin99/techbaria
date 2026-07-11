import { useEffect } from "react";

export function useAdjustmentsCacheBridge() {
  useEffect(() => { /* No-op: API client handles caching */ }, []);
}
