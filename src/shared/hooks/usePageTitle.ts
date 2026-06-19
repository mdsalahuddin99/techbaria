"use client";

import { useEffect } from "react";

/**
 * Set the document title for client components.
 * Works with the layout's `title.template` pattern ("%s | ShopFlow").
 *
 * Usage:
 * ```tsx
 * usePageTitle("Products");
 * // → <title>Products | ShopFlow</title>
 * ```
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | ShopFlow`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
