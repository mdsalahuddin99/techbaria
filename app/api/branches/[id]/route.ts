export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { z } from "zod";

const branchUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isHeadOffice: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, branchUpdateSchema);
  
  // If this is set as head office, unset others
  if (body.isHeadOffice) {
    await prisma.branch.updateMany({
      where: { shopId: ctx.shopId, id: { not: params.id } },
      data: { isHeadOffice: false },
    });
  }
  
  const branch = await prisma.branch.update({
    where: { id: params.id, shopId: ctx.shopId },
    data: body,
  });
  
  return branch;
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await prisma.branch.deleteMany({
    where: { id: params.id, shopId: ctx.shopId },
  });
  return { success: true };
});
