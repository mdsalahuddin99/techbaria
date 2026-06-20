export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  // Delete return (which is a Sale with status REFUNDED)
  const sale = await prisma.sale.findFirst({
    where: { id: params.id, status: "REFUNDED" },
  });

  if (!sale) {
    return Response.json({ error: "Return not found" }, { status: 404 });
  }

  // Delete tenders and items first, then the sale
  await prisma.$transaction([
    prisma.saleTender.deleteMany({ where: { saleId: sale.id } }),
    prisma.saleItem.deleteMany({ where: { saleId: sale.id } }),
    prisma.sale.delete({ where: { id: sale.id } }),
  ]);

  return { success: true };
});
