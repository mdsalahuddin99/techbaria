export const runtime = "nodejs";

import { prisma } from "@/server/db/client";
import { auth } from "@/server/auth/config";
import { NextResponse } from "next/server";
import { otpRateLimiter } from "@/lib/rateLimiter";

/**
 * GET /api/storefront/my-orders
 *
 * Returns storefront orders for the currently authenticated user (VIEWER).
 * Unlike /api/storefront/orders (which requires MANAGER+), this endpoint
 * only returns orders created by the current user.
 */
export async function GET(req: Request) {
  await otpRateLimiter(req);
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const orders = await prisma.sale.findMany({
    where: {
      userId,
      channel: "STOREFRONT",
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serialized = orders.map((o) => ({
    id: o.id,
    orderNo: (o.data as any)?.orderNo ?? o.id.slice(-6).toUpperCase(),
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      price: Number(i.price),
    })),
    subtotal: Number(o.subtotal),
    shipping: Number((o.data as any)?.shipping ?? 0),
    total: Number(o.total),
    status: (o.data as any)?.storefrontStatus ?? "pending",
    address: (o.data as any)?.shippingAddress ?? {},
    createdAt: o.createdAt.toISOString(),
  }));

  return NextResponse.json(serialized);
}
