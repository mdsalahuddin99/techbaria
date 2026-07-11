export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import { Prisma } from "@prisma/client";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId") ?? null;
  const q = url.searchParams.get("q")?.toLowerCase().trim() || "";
  const category = url.searchParams.get("category") || "all";
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const where: Prisma.ProductWhereInput = {
    isPublished: true,
  };

  if (category !== "all") {
    where.category = { name: category };
  }

  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    const wordConditions = terms.map(term => ({
      OR: [
        { name: { contains: term, mode: "insensitive" as const } },
        { sku: { contains: term, mode: "insensitive" as const } },
        { globalBrand: { name: { contains: term, mode: "insensitive" as const } } },
        { globalModel: { name: { contains: term, mode: "insensitive" as const } } },
        { category: { name: { contains: term, mode: "insensitive" as const } } }
      ]
    }));

    where.AND = [
      {
        OR: [
          { barcode: { equals: q, mode: "insensitive" as const } },
          { serialNumbers: { some: { serial: { equals: q, mode: "insensitive" as const } } } },
          { AND: wordConditions }
        ]
      }
    ];
  }

  const select = {
    id: true,
    name: true,
    barcode: true,
    sku: true,
    price: true,
    cost: true,
    isPublished: true,
    wholesalePrice: true,
    reorderLevel: true,
    emoji: true,
    color: true,
    storage: true,
    ram: true,
    condition: true,
    trackSerials: true,
    supplierId: true,
    warrantyStartDate: true,
    warrantyMonths: true,
    // purchaseItems omitted for search performance
    category: { select: { name: true } },
    images: { select: { url: true }, take: 1, orderBy: { position: "asc" as const } },
    globalBrand: { select: { name: true } },
    globalModel: { select: { name: true } },
    globalSeries: { select: { name: true } },
    subcategory: true,
    ...(warehouseId
      ? {
          warehouseStocks: {
            where: { warehouseId },
            select: { qty: true },
          },
        }
      : {}),
    serialNumbers: {
      where: { status: "IN_STOCK" as const },
      select: { 
        serial: true,
      },
    },
    stock: true,
  };

  const products = await prisma.product.findMany({
    where,
    select,
    orderBy: { name: "asc" },
    take: limit,
  });

  return Response.json({ items: products });
});
