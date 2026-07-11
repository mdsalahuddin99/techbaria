import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

export async function GET(req: Request) {
  try {
    const phone = "01742104445"; // Mufti Ismail
    const customer = await prisma.customer.findFirst({ where: { phone } });
    
    if (!customer) return NextResponse.json({ error: "Customer not found" });

    const sales = await prisma.sale.findMany({
      where: { customerId: customer.id }
    });

    const txs = await prisma.customerTransaction.findMany({
      where: { customerId: customer.id }
    });

    return NextResponse.json({
      customer,
      salesCount: sales.length,
      sales: sales.map(s => ({ id: s.id, status: s.status, customerId: s.customerId, total: s.total })),
      txs: txs.map(t => ({ id: t.id, type: t.type, amount: t.amount, saleId: t.saleId, ref: t.reference }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
