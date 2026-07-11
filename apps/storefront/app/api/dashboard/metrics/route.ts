import { NextResponse } from "next/server";
import { dashboardService } from "@/server/services/dashboardService";
import { buildCtx } from "@/server/lib/ctx";
import { auth } from "@/server/auth/config";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = buildCtx({
      id: (session.user as any).id,
      role: (session.user as any).role,
    });

    const metrics = await dashboardService.getMetrics(ctx);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
