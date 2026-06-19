// src/lib/context.ts
/**
 * Utility to extract the shop identifier for multi‑tenant scoping.
 * For now it reads from the authenticated session (if present) or falls back
 * to an env variable. Adjust as needed for your routing strategy.
 */
export function getShopId(user: any): string {
  // `user` is the NextAuth session user payload.
  if (user && typeof user.shopId === "string" && user.shopId) {
    return user.shopId;
  }
  // Fallback to a default shop if defined (useful for dev / single‑tenant).
  const defaultShop = process.env.DEFAULT_SHOP_ID;
  if (!defaultShop) {
    throw new Error("Shop ID is not available in session and DEFAULT_SHOP_ID is unset.");
  }
  return defaultShop;
}
