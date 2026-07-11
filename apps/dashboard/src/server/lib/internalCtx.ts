import type { Ctx } from "./ctx";

/**
 * Returns a mock internal context for server-side operations
 * where an actual user session is not available (e.g., public storefront).
 */
export function getInternalCtx(): Ctx {
  return {
    userId: "system",
    role: "USER",
    permissions: [],
  };
}
