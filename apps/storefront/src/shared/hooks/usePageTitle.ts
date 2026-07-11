"use client";

import { useEffect } from "react";

/**
 * Set the document title for client components.
 * Works with the layout's `title.template` pattern ("%s | Tech Baria").
 *
 * Usage:
 * ```tsx
 * usePageTitle("Products");
 * // → <title>Products | Tech Baria</title>
 * ```
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | Tech Baria`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
