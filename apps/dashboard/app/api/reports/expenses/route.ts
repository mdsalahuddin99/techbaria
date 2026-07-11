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

    const ctx = buildCtx({
      id: (session.user as any).id,
      role: (session.user as any).role,
    });

    const expenses = await reportsService.getExpensesDetailed(ctx, from, to);
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error("Expenses metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
