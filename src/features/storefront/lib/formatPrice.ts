/** Bangladesh Taka formatter — single source for the storefront. */
export const formatPrice = (n: number): string =>
  `৳${Math.round(n).toLocaleString("en-BD")}`;

export const calcDiscountPct = (price: number, old?: number | null): number | null => {
  if (!old || old <= price) return null;
  return Math.round(((old - price) / old) * 100);
};

/** Stable URL slug for a product. We use id as the primary key for now. */
export const productSlug = (id: string): string => id;
