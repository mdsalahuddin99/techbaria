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
  /** User's role — determines permission level */
  role: "ADMIN" | "ADMIN" | "CASHIER" | "VIEWER";
}

/**
 * Build a Ctx from a NextAuth session user object.
 * Throws if required fields are missing.
 */
export function buildCtx(sessionUser: {
  id?: string | null;
  role?: string | null;
}): Ctx {
  if (!sessionUser.id || !sessionUser.role) {
    throw new Error("Incomplete session — cannot build Ctx");
  }
  return {
    userId: sessionUser.id,
    role: sessionUser.role as Ctx["role"],
  };
}
