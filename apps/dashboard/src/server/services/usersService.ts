import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";
import type { Permission } from "@/server/auth/permissions";

export interface UserOutput {
  id: string;
  name: string | null;
  email: string;
  role: string;
  permissions: Permission[];
  active: boolean;
  createdAt: Date;
}

export async function listUsers(ctx: Ctx): Promise<UserOutput[]> {
  // Only ADMIN can manage users
  requireRole(ctx, "ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    permissions: (u.permissions as Permission[]) ?? [],
    active: u.active,
    createdAt: u.createdAt,
  }));
}

export async function updateUserRoleAndPermissions(
  ctx: Ctx,
  userId: string,
  role: "ADMIN" | "CASHIER" | "USER",
  permissions: Permission[]
): Promise<UserOutput> {
  requireRole(ctx, "ADMIN");

  // Prevent self-demotion from ADMIN
  if (ctx.userId === userId && role !== "ADMIN") {
    throw new ServiceError("BAD_REQUEST", "You cannot demote your own admin account.", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      permissions,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    permissions: (updated.permissions as Permission[]) ?? [],
    active: updated.active,
    createdAt: updated.createdAt,
  };
}
