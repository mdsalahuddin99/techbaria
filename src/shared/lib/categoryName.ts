import type { Product } from "@/features/products/types";

/**
 * Safely extract the category display name from a Product.
 *
 * The API may return `category` as a plain string OR as a Prisma relation
 * object `{ id, name, slug, ... }`. This helper normalises both forms so
 * components never crash with "Objects are not valid as a React child".
 */
export function categoryName(p: Product): string;
export function categoryName(category: Product["category"]): string;
export function categoryName(p: Product | Product["category"]): string {
  if (typeof p === "string") return p;
  if (p && typeof p === "object" && "category" in p) {
    const cat = (p as Product).category;
    if (typeof cat === "string") return cat;
    return (cat as any)?.name ?? "";
  }
  if (p && typeof p === "object") return (p as any)?.name ?? "";
  return "";
}
