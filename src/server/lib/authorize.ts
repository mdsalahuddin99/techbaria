/**
 * Authorisation helper — centralised role-based access control.
 *
 * Use inside `apiHandler` or directly in route handlers/services.
 *
 * ```ts
 * import { authorize, type Role } from "@/server/lib/authorize";
 *
 * // Inside a handler:
 * authorize(ctx, ["OWNER", "MANAGER"]);
 * ```
 */
import "server-only";
import { ServiceError } from "./errors";
import type { Ctx } from "./ctx";

export type Role = "OWNER" | "MANAGER" | "CASHIER" | "VIEWER";

/**
 * Role hierarchy: higher roles inherit permissions of lower ones.
 * OWNER → all access, VIEWER → read-only.
 */
const hierarchy: Record<Role, number> = {
  OWNER: 100,
  MANAGER: 50,
  CASHIER: 20,
  VIEWER: 10,
};

/**
 * Check that the current user has at least one of the required roles.
 * Throws `ServiceError("FORBIDDEN")` if not authorised.
 *
 * ```ts
 * authorize(ctx, ["MANAGER", "OWNER"]);
 * ```
 */
export function authorize(ctx: Ctx, allowedRoles: Role[]): void {
  const userLevel = hierarchy[ctx.role];
  // Check if user's role is high enough to cover any of the allowed roles
  const hasAccess = allowedRoles.some((r) => userLevel >= hierarchy[r]);
  if (!hasAccess) {
    throw new ServiceError(
      "FORBIDDEN",
      `Requires one of: ${allowedRoles.join(", ")}`,
      403,
    );
  }
}

/**
 * Check if the current user has at least VIEWER access (read-only).
 * Safer default — use `authorize()` when you need write access.
 */
export function requireViewer(ctx: Ctx): void {
  authorize(ctx, ["VIEWER", "CASHIER", "MANAGER", "OWNER"]);
}
