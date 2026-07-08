import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

export async function GET() {
  try {
    const doc = await prisma.serialNumber.findUnique({
      where: { serial: "45724CAPSF4B88A" }
    });
    
    return NextResponse.json({ doc }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
