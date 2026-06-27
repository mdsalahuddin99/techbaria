/**
 * Role-Based Access Control (RBAC)
 *
 * Hierarchy: OWNER > MANAGER > CASHIER > VIEWER
 *
 * Usage in services:
 * ```ts
 * import { requireRole } from "@/server/auth/rbac";
 *
 * delete: (ctx: Ctx, id: string) => {
 *   requireRole(ctx, "ADMIN");
 *   return prisma.product.delete({ where: { id, shopId: ctx.shopId } });
 * }
 * ```
 */
import "server-only";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";

type Role = "ADMIN" | "CASHIER" | "VIEWER";

/** Higher number = more privileges */
const HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  CASHIER: 2,
  VIEWER: 1,
};

/**
 * Throws `ServiceError("FORBIDDEN")` if the user's role is below `minRole`.
 *
 * @param ctx - Server context with the authenticated user's role
 * @param minRole - Minimum required role for this action
 */
export function requireRole(ctx: Ctx, minRole: Role): void {
  const userLevel = HIERARCHY[ctx.role] ?? 0;
  const requiredLevel = HIERARCHY[minRole];

  if (userLevel < requiredLevel) {
    throw new ServiceError(
      "FORBIDDEN",
      `This action requires at least ${minRole} role`,
      403,
    );
  }
}

/**
 * Non-throwing check — returns `true` if the user meets or exceeds `minRole`.
 */
export function hasPermission(ctx: Ctx, minRole: Role): boolean {
  return (HIERARCHY[ctx.role] ?? 0) >= HIERARCHY[minRole];
}
