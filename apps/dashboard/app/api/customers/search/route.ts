export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { Prisma } from "@prisma/client";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.toLowerCase().trim() || "";
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const where: Prisma.CustomerWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      balance: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return Response.json({ items: customers });
});
