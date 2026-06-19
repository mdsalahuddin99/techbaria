import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { bundleAvailableStock } from "@/features/products/bundle";
import type { Product } from "@/features/products/types";
import type { SortKey } from "../types";

export interface StorefrontFilters {
  category?: string | null;
  brand?: string | null;
  /** Multi-brand filter — OR semantics. Takes precedence over `brand` if non-empty. */
  brands?: string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
  inStockOnly?: boolean;
  /** Only products with a defaultDiscount > 0. */
  onSaleOnly?: boolean;
}

/** Effective public stock — bundles use derived, simple uses .stock. */
export const publicStock = (p: Product, all: Product[]): number =>
  p.type === "bundle" ? bundleAvailableStock(p, all) : p.stock;

/**
 * Single source of truth for storefront product reads.
 * Filters out inactive products and applies search/category/sort.
 */
export function useStorefrontProducts(filters: StorefrontFilters = {}) {
  const { data: all = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["storefront", "products"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/products");
      if (!res.ok) throw new Error("Failed to fetch storefront products");
      return res.json();
    },
  });

  const visible = useMemo(() => all.filter((p) => p.active !== false), [all]);

  const filtered = useMemo(() => {
    let list = visible;
    if (filters.category) {
      const c = filters.category.toLowerCase();
      list = list.filter(
        (p) => p.category.toLowerCase() === c || (p.subcategory ?? "").toLowerCase() === c,
      );
    }
    if (filters.brands && filters.brands.length > 0) {
      const set = new Set(filters.brands.map((b) => b.toLowerCase()));
      list = list.filter((p) => p.brand && set.has(p.brand.toLowerCase()));
    } else if (filters.brand) {
      list = list.filter((p) => (p.brand ?? "").toLowerCase() === filters.brand!.toLowerCase());
    }
    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q) ||
          (p.model ?? "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (typeof filters.minPrice === "number") {
      list = list.filter((p) => p.price >= filters.minPrice!);
    }
    if (typeof filters.maxPrice === "number") {
      list = list.filter((p) => p.price <= filters.maxPrice!);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => publicStock(p, all) > 0);
    }
    if (filters.onSaleOnly) {
      list = list.filter((p) => (p.defaultDiscount?.value ?? 0) > 0);
    }

    const sorted = [...list];
    switch (filters.sort) {
      case "price_low":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        // Without createdAt on product, fall back to id descending (newer first).
        sorted.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case "popular":
      default:
        sorted.sort((a, b) => publicStock(b, all) - publicStock(a, all));
    }
    return sorted;
  }, [visible, all, filters.category, filters.brand, filters.brands, filters.search, filters.minPrice, filters.maxPrice, filters.sort, filters.inStockOnly, filters.onSaleOnly]);

  return { products: filtered, all, isLoading, error };
}

/** Products with an obvious discount badge or premium tag — used on home. */
export function useFeaturedProducts(limit = 8) {
  const { products } = useStorefrontProducts({ sort: "popular" });
  return useMemo(() => products.slice(0, limit), [products, limit]);
}

/** "Flash deals" — for v1 we surface products with a defaultDiscount or low stock. */
export function useFlashDeals(limit = 6) {
  const { products } = useStorefrontProducts({});
  return useMemo(() => {
    const withDiscount = products.filter((p) => p.defaultDiscount && p.defaultDiscount.value > 0);
    const fallback = products.slice(0, limit);
    return (withDiscount.length ? withDiscount : fallback).slice(0, limit);
  }, [products, limit]);
}
