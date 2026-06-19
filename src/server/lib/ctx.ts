/**
 * Server context — every server service takes this as its first argument.
 * Populated by `apiHandler` from the Auth.js session.
 *
 * This type is the boundary between the HTTP layer and business logic.
 * Services never read Request/cookies/headers — only `Ctx`.
 */
import "server-only";

export interface Ctx {
  /** Current authenticated user's ID */
  userId: string;
  /** The shop this user belongs to (multi-tenant scoping) */
  shopId: string;
  /** User's role — determines permission level */
  role: "OWNER" | "MANAGER" | "CASHIER" | "VIEWER";
  /** Optional branch scoping for multi-branch shops */
  branchId?: string | null;
}

/**
 * Build a Ctx from a NextAuth session user object.
 * Throws if required fields are missing.
 */
export function buildCtx(sessionUser: {
  id?: string | null;
  shopId?: string | null;
  role?: string | null;
  branchId?: string | null;
}): Ctx {
  if (!sessionUser.id || !sessionUser.shopId || !sessionUser.role) {
    throw new Error("Incomplete session — cannot build Ctx");
  }
  return {
    userId: sessionUser.id,
    shopId: sessionUser.shopId,
    role: sessionUser.role as Ctx["role"],
    branchId: sessionUser.branchId ?? null,
  };
}
