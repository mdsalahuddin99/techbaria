import { useEffect } from "react";

export function useCustomersCacheBridge() {
  useEffect(() => { /* No-op: API client handles caching */ }, []);
}
