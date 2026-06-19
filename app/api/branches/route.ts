export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { z } from "zod";

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isHeadOffice: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const GET = apiHandler(async (ctx: Ctx) => {
  return prisma.branch.findMany({
    where: { shopId: ctx.shopId },
    orderBy: { name: "asc" },
  });
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, branchSchema);
  
  // If this is set as head office, unset others
  if (body.isHeadOffice) {
    await prisma.branch.updateMany({
      where: { shopId: ctx.shopId },
      data: { isHeadOffice: false },
    });
  }
  
  const branch = await prisma.branch.create({
    data: {
      ...body,
      shopId: ctx.shopId,
    },
  });
  
  return branch;
});
