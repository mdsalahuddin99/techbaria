import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import * as math from "@/server/lib/math";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fix = url.searchParams.get("fix") === "true";
  
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { due: { gt: 0 } },
          { sales: { some: { due: { gt: 0 } } } }
        ]
      },
      include: {
        sales: {
          where: { due: { gt: 0 }, status: "COMPLETED" },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const mismatches = [];
    const fixed = [];

    for (const customer of customers) {
      const customerDue = Number(customer.due);
      const sumOfSaleDue = customer.sales.reduce((sum, s) => math.add(sum, Number(s.due)), 0);

      if (customerDue !== sumOfSaleDue) {
        mismatches.push({
          customerId: customer.id,
          name: customer.name,
          customerDue,
          sumOfSaleDue,
          difference: math.sub(sumOfSaleDue, customerDue)
        });

        if (fix && sumOfSaleDue > customerDue) {
          // If sumOfSaleDue is greater, it means they paid the ledger but Sale.due wasn't updated.
          // We need to decrease Sale.due (and increase Sale.paid) for the oldest sales.
          let excessToClear = math.sub(sumOfSaleDue, customerDue);
          
          await prisma.$transaction(async (tx) => {
            for (const sale of customer.sales) {
              if (excessToClear <= 0) break;
              
              const saleDue = Number(sale.due);
              const salePaid = Number(sale.paid);
              const clearAmount = Math.min(saleDue, excessToClear);
              
              const newDue = math.sub(saleDue, clearAmount);
              const newPaid = math.add(salePaid, clearAmount);
              
              await tx.sale.update({
                where: { id: sale.id },
                data: {
                  due: newDue,
                  paid: newPaid,
                  tenders: {
                    create: {
                      type: "CASH", // Fake cash tender to balance the ledger
                      amount: clearAmount,
                      ref: "LEDGER-RECONCILE",
                    }
                  }
                }
              });
              
              excessToClear = math.sub(excessToClear, clearAmount);
            }
          });
          fixed.push(customer.id);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      mismatchesCount: mismatches.length,
      fixedCount: fixed.length,
      mismatches 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
