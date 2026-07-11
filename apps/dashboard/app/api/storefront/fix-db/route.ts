import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import * as math from "@/server/lib/math";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const results = {
      purchasesFixed: 0,
      customersFixed: 0,
      details: {
        purchases: [] as string[],
        customers: [] as string[]
      }
    };

    // 1. Fix Purchases Math
    const purchases = await prisma.purchase.findMany({
      include: { items: true },
    });

    for (const purchase of purchases) {
      const calculatedSubtotal = math.sumBy(purchase.items, (item) =>
        math.add(math.mul(item.qty, item.cost), Number(item.extraCost || 0))
      );

      const expectedTotal = math.sub(calculatedSubtotal, purchase.discount);
      const expectedDue = math.sub(expectedTotal, purchase.paid);

      const isSubtotalWrong = Number(purchase.subtotal) !== calculatedSubtotal;
      const isTotalWrong = Number(purchase.total) !== expectedTotal;
      const isDueWrong = Number(purchase.due) !== expectedDue;

      if (isSubtotalWrong || isTotalWrong || isDueWrong) {
        // Update the purchase to match the exact mathematical values based on its items
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            subtotal: calculatedSubtotal,
            total: expectedTotal,
            due: expectedDue,
          }
        });
        results.purchasesFixed++;
        results.details.purchases.push(`Purchase ${purchase.id} updated to Total: ${expectedTotal}`);
      }
    }

    // 2. Fix Customer Due Mismatches
    const customers = await prisma.customer.findMany({
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    for (const customer of customers) {
      if (customer.transactions.length > 0) {
        const lastTransaction = customer.transactions[0];
        if (Number(customer.due) !== Number(lastTransaction.balanceAfter)) {
          // Update the customer's due to match their ledger's actual balance
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              due: Number(lastTransaction.balanceAfter)
            }
          });
          results.customersFixed++;
          results.details.customers.push(
            `Customer '${customer.name}' due updated from ${customer.due} to ${lastTransaction.balanceAfter}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database fixes applied successfully!",
      results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
