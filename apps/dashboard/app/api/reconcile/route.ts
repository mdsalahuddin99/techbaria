import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, message: "Reconciliation script removed." }, { status: 404 });
}
