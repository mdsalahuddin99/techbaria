import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const serialDoc = await prisma.serialNumber.findUnique({
      where: { serial: "45724CAPSF4B88A" },
      include: {
        product: { include: { supplier: true } },
        purchaseItem: { include: { purchase: { include: { supplier: true } } } },
        saleItem: { include: { sale: true } }
      }
    });
    
    // Check all purchases for this product
    const purchases = await prisma.purchaseItem.findMany({
      where: { productId: serialDoc?.productId },
      include: { purchase: { include: { supplier: true } } },
      take: 2
    });

    const data = { serialDoc, purchases };
    fs.writeFileSync(path.join(process.cwd(), "db_dump.txt"), JSON.stringify(data, null, 2));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
