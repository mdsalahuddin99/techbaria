export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

export async function GET(req: Request) {
  try {
    const muftiId = "cmrdbvemj0000jm048vvd35lu";

    // Set loyalty points to 0
    const customer = await prisma.customer.update({
      where: { id: muftiId },
      data: {
        loyaltyPoints: 0
      }
    });

    return NextResponse.json({
      timestamp: Date.now(),
      success: true,
      customer
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
