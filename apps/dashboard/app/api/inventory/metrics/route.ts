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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const ctx = buildCtx({
      id: (session.user as any).id,
      role: (session.user as any).role,
    });

    const metrics = await reportsService.getInventoryMetrics(ctx, from || undefined, to || undefined);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Inventory metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
