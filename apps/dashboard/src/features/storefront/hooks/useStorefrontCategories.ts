import { useMemo } from "react";
import { Smartphone, Laptop, Cctv, Headphones, Watch, Cable, Camera, Monitor, Tv, Gamepad2, HardDrive, Cpu, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { StorefrontProduct } from "@/features/storefront/types";
import type { Category } from "@/features/products/types";

export interface StorefrontCategory {
  value: Category | string;
  label: string;
  icon: typeof Smartphone;
  count: number;
  color: string;
}

const ICON_MAP: Record<string, typeof Smartphone> = {
  Mobile: Smartphone,
  Laptop: Laptop,
  "CCTV Camera": Cctv,
  Camera: Camera,
  Monitor: Monitor,
  TV: Tv,
  Audio: Headphones,
  "Smart Watch": Watch,
  Cable: Cable,
  Gaming: Gamepad2,
  Storage: HardDrive,
  "DVR / NVR": Cpu,
  Electronics: Package,
  Computer: Cpu,
  Tablet: Smartphone,
  "Power Supply": Cpu,
  Accessories: Cable,
};

const COLORS = [
  "from-indigo-500/30 to-indigo-700/10",
  "from-violet-500/30 to-violet-700/10",
  "from-sky-500/30 to-sky-700/10",
  "from-fuchsia-500/30 to-fuchsia-700/10",
  "from-emerald-500/30 to-emerald-700/10",
  "from-amber-500/30 to-amber-700/10",
  "from-rose-500/30 to-rose-700/10",
  "from-cyan-500/30 to-cyan-700/10",
];

/** Pure function to derive categories from products (used by RSC and client hook). */
export function deriveCategories(products: StorefrontProduct[]): StorefrontCategory[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (p.active === false) continue;
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return entries.map(([name, count], i) => ({
    value: name,
    label: name,
    icon: ICON_MAP[name] ?? Package,
    count,
    color: COLORS[i % COLORS.length],
  }));
}

/**
 * Derives the visible category list from products in stock.
 * No separate categories fetch — keeps the public catalog tight.
 */
export function useStorefrontCategories(options?: { initialData?: StorefrontProduct[] }): StorefrontCategory[] {
  const { data = options?.initialData ?? [] } = useQuery<StorefrontProduct[]>({
    queryKey: ["storefront", "products"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/products");
      if (!res.ok) throw new Error("Failed to fetch storefront products");
      return res.json();
    },
  });

  return useMemo(() => deriveCategories(data), [data]);
}

/** Pure function to derive brands. */
export function deriveBrands(products: StorefrontProduct[]): string[] {
  const set = new Set<string>();
  for (const p of products) {
    if (p.active === false) continue;
    if (p.brand) set.add(p.brand);
  }
  return [...set].sort();
}

/** All brands present in the catalog. Filtered by category if provided. */
export function useStorefrontBrands(category?: string | null, options?: { initialData?: StorefrontProduct[] }): string[] {
  const { data = options?.initialData ?? [] } = useQuery<StorefrontProduct[]>({
    queryKey: ["storefront", "products"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/products");
      if (!res.ok) throw new Error("Failed to fetch storefront products");
      return res.json();
    },
  });
  return useMemo(() => {
    let filtered = data;
    if (category) {
      const c = category.toLowerCase();
      filtered = data.filter(
        (p) => p.category.toLowerCase() === c || (p.subcategory ?? "").toLowerCase() === c
      );
    }
    return deriveBrands(filtered);
  }, [data, category]);
}

export interface MegaMenuTree {
  category: string;
  subcategories: {
    subcategory: string;
    brands: string[];
  }[];
}

export function useMegaMenuTree(options?: { initialData?: StorefrontProduct[] }): MegaMenuTree[] {
  const { data = options?.initialData ?? [] } = useQuery<StorefrontProduct[]>({
    queryKey: ["storefront", "products"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/products");
      if (!res.ok) throw new Error("Failed to fetch storefront products");
      return res.json();
    },
    initialData: options?.initialData,
  });

  return useMemo(() => {
    // Map<Category, Map<Subcategory, Set<Brand>>>
    const tree = new Map<string, Map<string, Set<string>>>();

    for (const p of data) {
      if (p.active === false) continue;
      
      const cat = p.category;
      if (!cat) continue;
      
      if (!tree.has(cat)) {
        tree.set(cat, new Map());
      }
      
      const subMap = tree.get(cat)!;
      // Use 'Others' or similar if no subcategory is present
      const sub = p.subcategory || "Other";
      
      if (!subMap.has(sub)) {
        subMap.set(sub, new Set());
      }
      
      const brandSet = subMap.get(sub)!;
      if (p.brand) {
        brandSet.add(p.brand);
      }
    }

    const result: MegaMenuTree[] = [];
    for (const [cat, subMap] of tree.entries()) {
      const subcategories = [];
      for (const [sub, brandSet] of subMap.entries()) {
        subcategories.push({
          subcategory: sub,
          brands: [...brandSet].sort(),
        });
      }
      // Sort subcategories alphabetically
      subcategories.sort((a, b) => a.subcategory.localeCompare(b.subcategory));
      result.push({
        category: cat,
        subcategories,
      });
    }

    // Sort categories alphabetically
    result.sort((a, b) => a.category.localeCompare(b.category));
    
    return result;
  }, [data]);
}
