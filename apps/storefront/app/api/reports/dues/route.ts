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

    const ctx = buildCtx({
      id: (session.user as any).id,
      role: (session.user as any).role,
    });

    const dues = await reportsService.getDuesMetrics(ctx);
    return NextResponse.json(dues);
  } catch (error: any) {
    console.error("Dues metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
