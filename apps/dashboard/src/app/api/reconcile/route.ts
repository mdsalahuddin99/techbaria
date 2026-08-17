import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

export async function GET() {
  let log = "";
  try {
    log += "Starting reconciliation of customer due/balance...\n";
    
    const customers = await prisma.customer.findMany({
      where: {
        due: { gt: 0 },
        balance: { gt: 0 }
      }
    });

    log += `Found ${customers.length} customers with both due and balance.\n`;

    for (const cust of customers) {
      const due = Number(cust.due);
      const balance = Number(cust.balance);

      const minAmount = Math.min(due, balance);

      if (minAmount > 0) {
        log += `Reconciling Customer: ${cust.name} (ID: ${cust.id})\n`;
        log += `  Current Due: ${due} | Current Balance: ${balance}\n`;
        log += `  Applying ${minAmount} from Balance to Due.\n`;

        const newDue = due - minAmount;
        const newBalance = balance - minAmount;

        await prisma.$transaction([
          prisma.customer.update({
            where: { id: cust.id },
            data: {
              due: newDue,
              balance: newBalance,
            }
          }),
          prisma.customerTransaction.create({
            data: {
              customerId: cust.id,
              type: "ADJUSTMENT",
              amount: minAmount,
              balanceBefore: balance,
              balanceAfter: newBalance,
              reference: `RECONCILE-${Date.now().toString().slice(-6)}`,
              notes: `System Reconciliation: Applied ৳${minAmount} wallet balance to clear due.`,
            }
          })
        ]);

        log += `  [Done] New Due: ${newDue} | New Balance: ${newBalance}\n`;
      }
    }

    log += "Reconciliation finished.\n";
    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
