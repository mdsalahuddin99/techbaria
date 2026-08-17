import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting reconciliation of customer due/balance...");
  
  // Find customers that have both due > 0 and balance > 0
  const customers = await prisma.customer.findMany({
    where: {
      due: { gt: 0 },
      balance: { gt: 0 }
    }
  });

  console.log(`Found ${customers.length} customers with both due and balance.`);

  for (const cust of customers) {
    const due = Number(cust.due);
    const balance = Number(cust.balance);

    const minAmount = Math.min(due, balance);

    if (minAmount > 0) {
      console.log(`Reconciling Customer: ${cust.name} (ID: ${cust.id})`);
      console.log(`  Current Due: ${due} | Current Balance: ${balance}`);
      console.log(`  Applying ${minAmount} from Balance to Due.`);

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
            notes: `System Reconciliation: Applied ৳${minAmount} wallet balance to clear due. (Due: ${due} -> ${newDue}, Balance: ${balance} -> ${newBalance})`,
          }
        })
      ]);

      console.log(`  [Done] New Due: ${newDue} | New Balance: ${newBalance}`);
    }
  }

  console.log("Reconciliation finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
