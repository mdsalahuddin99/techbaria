import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import * as math from "@/server/lib/math";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const report = {
      salesWithMathErrors: [] as any[],
      purchasesWithMathErrors: [] as any[],
      customersWithDueMismatch: [] as any[],
    };

    // 1. Audit Sales
    const sales = await prisma.sale.findMany({
      include: { items: true },
    });

    for (const sale of sales) {
      const calculatedSubtotal = math.sumBy(sale.items, (item) =>
        math.sub(math.mul(item.qty, item.price), item.discount)
      );
      
      const expectedTotal = math.sub(calculatedSubtotal, sale.discount);
      const expectedDue = math.sub(expectedTotal, sale.paid);

      const isSubtotalWrong = Number(sale.subtotal) !== calculatedSubtotal;
      const isTotalWrong = Number(sale.total) !== expectedTotal;
      const isDueWrong = Number(sale.due) !== expectedDue;

      if (isSubtotalWrong || isTotalWrong || isDueWrong) {
        report.salesWithMathErrors.push({
          saleId: sale.id,
          recorded: {
            subtotal: Number(sale.subtotal),
            total: Number(sale.total),
            due: Number(sale.due),
          },
          calculated: {
            subtotal: calculatedSubtotal,
            total: expectedTotal,
            due: expectedDue,
          },
        });
      }
    }

    // 2. Audit Purchases
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
        report.purchasesWithMathErrors.push({
          purchaseId: purchase.id,
          recorded: {
            subtotal: Number(purchase.subtotal),
            total: Number(purchase.total),
            due: Number(purchase.due),
          },
          calculated: {
            subtotal: calculatedSubtotal,
            total: expectedTotal,
            due: expectedDue,
          },
        });
      }
    }

    // 3. Audit Customer Ledger (Basic Check)
    // Here we check if the last transaction's balanceAfter matches the current customer due.
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
          report.customersWithDueMismatch.push({
            customerId: customer.id,
            name: customer.name,
            recordedDue: Number(customer.due),
            ledgerBalanceAfter: Number(lastTransaction.balanceAfter),
            lastTransactionId: lastTransaction.id
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Audit completed successfully. See report below.",
      report,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
