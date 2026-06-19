export const runtime = "nodejs";

import { prisma } from "@/server/db/client";
import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/storefront/customers
 *
 * Returns all VIEWER (storefront) users for the current shop.
 * Requires MANAGER+.
 */
export const GET = apiHandler(async (ctx: Ctx) => {
  const users = await prisma.user.findMany({
    where: { shopId: ctx.shopId, role: "VIEWER" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { items: users };
}, "storefront:customers:list", ["MANAGER", "OWNER"]);
