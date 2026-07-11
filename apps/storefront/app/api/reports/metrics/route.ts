import { NextResponse } from "next/server";
import { reportsService } from "@/server/services/reportsService";
import { buildCtx } from "@/server/lib/ctx";
import { auth } from "@/server/auth/config";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = searchParams.get("to") || new Date().toISOString();
    const paymentMethod = searchParams.get("paymentMethod") || "All";

    const ctx = buildCtx({
      id: (session.user as any).id,
      role: (session.user as any).role,
    });

    const metrics = await reportsService.getMetrics(ctx, from, to, paymentMethod);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Reports metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
