import "server-only";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";

export type Permission = 
  | "POS" 
  | "INVENTORY" 
  | "ECOMMERCE" 
  | "REPORTS" 
  | "SETTINGS" 
  | "USERS"
  | "FINANCE"
  | "PEOPLE";

export const PERMISSIONS: readonly Permission[] = [
  "POS",
  "INVENTORY",
  "ECOMMERCE",
  "REPORTS",
  "SETTINGS",
  "USERS",
  "FINANCE",
  "PEOPLE"
] as const;

/**
 * Throws `ServiceError("FORBIDDEN")` if the user lacks the permission
 * AND is not an ADMIN.
 * 
 * @param ctx - Server context
 * @param permission - The required permission string
 */
export function requirePermission(ctx: Ctx, permission: Permission): void {
  // ADMIN role implicitly has all permissions
  if (ctx.role === "ADMIN") return;

  const userPermissions = (ctx as any).permissions as string[] | undefined;
  if (!userPermissions?.includes(permission)) {
    throw new ServiceError(
      "FORBIDDEN",
      `This action requires ${permission} permission.`,
      403,
    );
  }
}

/**
 * Non-throwing check — returns `true` if the user has the permission or is ADMIN.
 */
export function hasPermission(ctx: Ctx, permission: Permission): boolean {
  if (ctx.role === "ADMIN") return true;
  const userPermissions = (ctx as any).permissions as string[] | undefined;
  return !!userPermissions?.includes(permission);
}
