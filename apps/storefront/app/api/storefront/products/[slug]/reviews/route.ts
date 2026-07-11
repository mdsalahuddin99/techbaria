export const runtime = "nodejs";

import { prisma } from "@/server/db/client";
import { publicApiHandler } from "@/server/lib/apiHandler";

/** GET /api/storefront/products/[slug]/reviews — approved reviews only */
export const GET = publicApiHandler(
  async (_req: Request, { params }: { params: Record<string, string | string[]> | undefined }) => {
    const slug = params?.slug as string | undefined;
    if (!slug) return new Response("Not found", { status: 404 });

    // Find the product first (slug or id)
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true },
    });
    if (!product) return new Response("Not found", { status: 404 });

    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id, approved: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    // Aggregate stats
    const all = await prisma.productReview.findMany({
      where: { productId: product.id, approved: true },
      select: { rating: true },
    });
    const total = all.length;
    const avg = total > 0 ? Math.round((all.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: all.filter((r) => r.rating === star).length,
    }));

    return Response.json({ reviews, stats: { avg, total, breakdown } });
  }
);

/** POST /api/storefront/products/[slug]/reviews — submit a new review */
export const POST = publicApiHandler(
  async (req: Request, { params }: { params: Record<string, string | string[]> | undefined }) => {
    const slug = params?.slug as string | undefined;
    if (!slug) return new Response("Not found", { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { reviewerName, rating, comment } = body as {
      reviewerName?: string;
      rating?: number;
      comment?: string;
    };

    if (!reviewerName?.trim()) return Response.json({ error: "নাম দিন" }, { status: 400 });
    if (!rating || rating < 1 || rating > 5) return Response.json({ error: "রেটিং দিন (১-৫)" }, { status: 400 });
    if (!comment?.trim()) return Response.json({ error: "মন্তব্য লিখুন" }, { status: 400 });

    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true },
    });
    if (!product) return new Response("Not found", { status: 404 });

    await prisma.productReview.create({
      data: {
        productId: product.id,
        reviewerName: reviewerName.trim().slice(0, 100),
        rating: Number(rating),
        comment: comment.trim().slice(0, 2000),
        approved: false, // admin approval required
      },
    });

    return Response.json({ success: true, message: "রিভিউ জমা হয়েছে। অনুমোদনের পরে দেখা যাবে।" });
  }
);
