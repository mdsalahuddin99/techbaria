import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { supplierLedgerService } from "@/server/services/supplierLedgerService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const ctx = buildCtx(session.user as any);
    const body = await request.json();

    const { action, supplierId, amount, accountId, reference, notes, date } = body;

    if (!supplierId || !amount || !accountId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (action === "deposit") {
      const result = await supplierLedgerService.depositAdvance(
        ctx,
        supplierId,
        amount,
        accountId,
        reference,
        notes,
        date
      );
      return NextResponse.json(result);
    } else if (action === "withdraw") {
      const result = await supplierLedgerService.withdrawAdvance(
        ctx,
        supplierId,
        amount,
        accountId,
        reference,
        notes,
        date
      );
      return NextResponse.json(result);
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }
  } catch (error: any) {
    console.error("POST /api/suppliers/wallet error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
