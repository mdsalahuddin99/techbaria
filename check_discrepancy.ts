import { prisma } from "./src/server/db/client";

async function main() {
  const customerId = "cmqpk6l660000a6e6h7q4p6z0"; // We don't know the ID, we will find it by name or phone
  const phone = "01742104445"; // From the screenshot: Mufti Ismail, 01742104445

  const customer = await prisma.customer.findFirst({
    where: { phone }
  });

  if (!customer) {
    console.log("Customer not found");
    return;
  }

  console.log("Customer ID:", customer.id);
  console.log("Customer totalSpent:", customer.totalSpent);

  const sales = await prisma.sale.findMany({
    where: { customerId: customer.id }
  });

  console.log(`Found ${sales.length} sales with this customerId directly.`);
  if (sales.length > 0) {
    console.log(sales.map(s => ({ id: s.id, total: s.total, status: s.status, data: s.data })));
  }

  const txs = await prisma.customerTransaction.findMany({
    where: { customerId: customer.id, type: "SALE" },
    include: { sale: true }
  });

  console.log(`Found ${txs.length} SALE transactions in ledger.`);
  for (const tx of txs) {
    console.log(`TX ID: ${tx.id}, Amount: ${tx.amount}, saleId: ${tx.saleId}`);
    if (tx.sale) {
      console.log(`  -> Sale customerId: ${tx.sale.customerId}`);
    } else {
      console.log(`  -> No Sale attached or Sale was deleted!`);
    }
  }
}

main().catch(console.error);
