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
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { model: { name: { contains: q, mode: "insensitive" } } },
      { serialNumbers: { some: { OR: [ { serial: { contains: q, mode: "insensitive" } } ] } } }
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
    purchaseItems: {
      orderBy: { purchase: { createdAt: "desc" } } as const,
      take: 1,
      select: {
        warrantyStartDate: true,
        warrantyMonths: true,
      },
    },
    category: { select: { name: true } },
    images: { select: { url: true }, take: 1, orderBy: { position: "asc" as const } },
    brand: { select: { name: true } },
    model: { select: { name: true } },
    series: { select: { name: true } },
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
        warrantyExpiryDate: true, 
        createdAt: true,
        purchaseItem: { select: { warrantyStartDate: true, warrantyMonths: true } }
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
