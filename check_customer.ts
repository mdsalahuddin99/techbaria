import { prisma } from "./src/server/db/client";

async function check() {
  const customerId = process.argv[2];
  if (!customerId) return console.error("No customer ID provided");

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      name: true,
      due: true,
      totalSpent: true,
      sales: {
        select: { id: true, total: true, status: true },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        select: { type: true, amount: true, notes: true, saleId: true, balanceBefore: true, balanceAfter: true }
      }
    }
  });

  console.log(JSON.stringify(customer, null, 2));
}

check().catch(console.error);
