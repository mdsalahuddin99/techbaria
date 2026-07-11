import { useEffect } from "react";

export function useTransfersCacheBridge() {
  useEffect(() => { /* No-op: API client handles caching */ }, []);
}
