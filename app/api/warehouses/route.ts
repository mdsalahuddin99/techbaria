export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return warehouses;
});
