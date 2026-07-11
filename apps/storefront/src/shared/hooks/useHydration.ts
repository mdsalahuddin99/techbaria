import { useState, useEffect } from "react";

/**
 * A hook to safely check if the component has mounted on the client.
 * Use this to avoid React hydration mismatches when using data from localStorage or window.
 */
export function useHydration() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
