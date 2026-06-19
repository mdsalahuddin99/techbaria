import { useEffect } from "react";

export function useAccountsCacheBridge() {
  useEffect(() => { /* No-op: API client handles caching */ }, []);
}
