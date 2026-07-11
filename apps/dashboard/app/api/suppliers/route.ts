import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { suppliersService } from "@/server/services/suppliersService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const ctx = buildCtx(session.user as any);

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;
    const sortKey = searchParams.get("sortKey") as any || undefined;
    const sortDir = searchParams.get("sortDir") as any || undefined;

    const data = await suppliersService.list(
      ctx,
      { cursor: cursor || undefined, limit },
      { search, sortKey, sortDir }
    );
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/suppliers error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
