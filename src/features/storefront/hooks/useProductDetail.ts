import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/features/products/types";
import { publicStock } from "./useStorefrontProducts";

/** Single-product loader + a small "related" derivation (same category). */
export function useProductDetail(slug: string | undefined) {
  // 1. Fetch this specific product by slug
  const { data: product = null, isLoading: isProductLoading } = useQuery<Product | null>({
    queryKey: ["storefront", "product", slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await fetch(`/api/storefront/products/${slug}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch product details");
      }
      return res.json();
    },
    enabled: !!slug,
  });

  // 2. Fetch all products to derive related items and calculate stock
  const { data: all = [], isLoading: isAllLoading } = useQuery<Product[]>({
    queryKey: ["storefront", "products"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/products");
      if (!res.ok) throw new Error("Failed to fetch storefront products");
      return res.json();
    },
  });

  const related = useMemo(() => {
    if (!product) return [];
    return all
      .filter((p) => p.id !== product.id && p.category === product.category && p.active !== false)
      .slice(0, 6);
  }, [all, product]);

  const stock = useMemo(() => (product ? publicStock(product, all) : 0), [product, all]);

  return { product, related, stock, isLoading: isProductLoading || isAllLoading };
}
