export const runtime = "nodejs";

import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db/client";

/**
 * GET /api/auth/profile — returns the current user profile (id, name, email, role, shopId).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, image: true, role: true, shopId: true },
    });

    if (!user) {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return Response.json(user);
  } catch (err) {
    console.error("[profile GET] error:", err);
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * PATCH /api/auth/profile — update name / image.
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = await req.json();
    const { name, image } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(typeof name === "string" && { name }),
        ...(typeof image === "string" && { image }),
      },
      select: { id: true, email: true, name: true, image: true, role: true, shopId: true },
    });

    return Response.json(updated);
  } catch (err) {
    console.error("[profile PATCH] error:", err);
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
