import { useEffect } from "react";

export function useExpensesCacheBridge() {
  useEffect(() => { /* No-op: API client handles caching */ }, []);
}
