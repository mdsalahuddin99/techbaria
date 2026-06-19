"use client";

import { useEffect, useState } from "react";

/**
 * Fetch distinct field values from /api/products/values for AutoSuggest.
 * Always fetches fresh data when field changes or component mounts.
 *
 * @param field  The field name (brand, model, series, category, subcategory, etc.)
 * @param parent  Optional parent filter (used for subcategory to filter by category name)
 */
export function useDistinctValues(field: string, parent?: string): string[] {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchValues = async () => {
      try {
        const params = new URLSearchParams({ field });
        if (parent) params.set("parent", parent);
        const res = await fetch(`/api/products/values?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const list: string[] = json.values ?? [];
        if (!cancelled) setValues(list);
      } catch {
        // silently fail — suggestions are optional
      }
    };

    fetchValues();

    return () => {
      cancelled = true;
    };
  }, [field, parent]);

  return values;
}
