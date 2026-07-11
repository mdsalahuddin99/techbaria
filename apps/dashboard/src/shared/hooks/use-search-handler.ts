"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Fields you can search in — keys of T whose value is string-like. */
type StringKeyOf<T> = {
  [K in keyof T]: T[K] extends string | null | undefined ? K : never;
}[keyof T];

export interface ClientSearchConfig<T> {
  mode: "client";

  /** Full dataset (from an existing React Query or local state). */
  data: T[];

  /**
   * Which fields to search in. All provided fields are OR-ed:
   * `item.fieldA.toLowerCase().includes(q) || item.fieldB.toLowerCase().includes(q)`.
   *
   * If you need a custom predicate, use `customFilter` instead.
   */
  fields?: StringKeyOf<T>[];

  /**
   * Alternative to `fields` — full control over the match logic.
   * Signature: `(item: T, search: string) => boolean`
   */
  customFilter?: (item: T, search: string) => boolean;
}

export interface ServerSearchConfig<T> {
  mode: "server";

  /** Base query-key that React Query uses to cache results. */
  queryKey: unknown[];

  /**
   * Server-side fetch function.
   * Receives the current debounced search term, returns filtered data.
   */
  fetcherFn: (search: string) => Promise<T[]>;

  /** Optional: enable/disable the query (e.g. wait for auth). */
  enabled?: boolean;
}

export type SearchConfig<T> = ClientSearchConfig<T> | ServerSearchConfig<T>;

export interface UseSearchHandlerReturn<T> {
  /** Current raw (undebounced) search input. */
  searchTerm: string;
  /** Setter — bind to `<input value={searchTerm} onChange={…} />`. */
  setSearchTerm: (value: string) => void;

  /** Debounced search term (the one actually used for filtering). */
  debouncedSearch: string;

  /** Filtered / server-returned results. */
  results: T[];

  /** True while filtering is "in flight" (debounce window active). */
  isSearching: boolean;

  /** True when the search yields zero results (only relevant when `searchTerm` is non-empty). */
  isEmpty: boolean;

  /** Reset search to empty string. */
  clearSearch: () => void;

  /** Total items before filtering (client mode). */
  total: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

/**
 * A reusable, React-Query–friendly search handler.
 *
 * ## Client-side mode (default)
 * ```ts
 * const { searchTerm, setSearchTerm, results, isSearching } = useSearchHandler({
 *   mode: "client",
 *   data: allProducts,
 *   fields: ["name", "sku", "barcode"],
 * });
 * ```
 *
 * ## Server-side mode (future / when dataset grows large)
 * ```ts
 * const { searchTerm, setSearchTerm, results, isSearching } = useSearchHandler({
 *   mode: "server",
 *   queryKey: productKeys.search(term),
 *   fetcherFn: (q) => productsService.search(q),
 * });
 * ```
 *
 * ## Custom filter
 * ```ts
 * useSearchHandler({
 *   mode: "client",
 *   data: purchases,
 *   customFilter: (po, q) =>
 *     po.poNumber.toLowerCase().includes(q) ||
 *     po.supplierName.toLowerCase().includes(q),
 * });
 * ```
 *
 * @param config  Search configuration (client or server mode).
 * @param debounceMs  Debounce delay in ms (default: 300).
 */
export function useSearchHandler<T>(
  config: SearchConfig<T>,
  debounceMs = 300,
): UseSearchHandlerReturn<T> {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountRef = useRef(true);

  // ── Debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip the first mount — no artificial "searching" flash on init.
    if (mountRef.current) {
      mountRef.current = false;
      return;
    }

    setIsSearching(true);

    timerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchTerm, debounceMs]);

  // Clear debounce state when search is cleared externally.
  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setIsSearching(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // ── Client-side filtering ────────────────────────────────────────────
  const isClient = config.mode === "client";
  const clientData = isClient ? config.data : ([] as T[]);
  const clientFields = isClient ? config.fields : undefined;
  const clientFilter = isClient ? config.customFilter : undefined;

  const clientResults = useMemo<T[]>(() => {
    if (!isClient) return [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return clientData;

    return clientData.filter((item) => {
      if (clientFilter) {
        return clientFilter(item, q);
      }
      if (clientFields && clientFields.length > 0) {
        return clientFields.some((field) => {
          const val = item[field as keyof T];
          return val != null && String(val).toLowerCase().includes(q);
        });
      }
      // Fallback: if no fields/customFilter provided, match any string property.
      return Object.values(item as Record<string, unknown>).some((v) =>
        v != null && String(v).toLowerCase().includes(q),
      );
    });
  }, [isClient, clientData, clientFields, clientFilter, debouncedSearch]);

  // ── Server-side query ────────────────────────────────────────────────
  const serverQuery = useQuery<T[]>({
    queryKey: config.mode === "server"
      ? [...config.queryKey, debouncedSearch]
      : ["__noop__"],
    queryFn: config.mode === "server"
      ? () => config.fetcherFn(debouncedSearch)
      : () => Promise.resolve([] as unknown as T[]),
    enabled: config.mode === "server"
      && (config.enabled ?? true)
      && debouncedSearch.length >= 0,
    staleTime: 30_000, // 30s cache for repeated searches
  });

  // ── Derived state ────────────────────────────────────────────────────
  const results = config.mode === "client"
    ? clientResults
    : ((serverQuery.data ?? []) as T[]);

  const isEmpty = debouncedSearch.trim().length > 0 && results.length === 0;
  const total = config.mode === "client" ? clientData.length : results.length;

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    results,
    isSearching,
    isEmpty,
    clearSearch,
    total,
  };
}
