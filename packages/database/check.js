const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmrjc3cu30001i904cp2lnxiz';
  
  const suppPayments = await prisma.supplierPayment.findMany({ where: { accountId } });
  console.log("Supplier Payments:", suppPayments);
  
  const expenses = await prisma.expense.findMany({ where: { accountId } });
  console.log("Expenses:", expenses);
  
  const purchases = await prisma.purchaseTender.findMany({ where: { accountId } });
  console.log("Purchase Tenders:", purchases.map(p => ({ id: p.id, amount: Number(p.amount) })));
}

main().finally(() => prisma.$disconnect());
