const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmrjc3cu30001i904cp2lnxiz';
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } });
  
  const purchases = await prisma.purchaseTender.findMany({ where: { accountId } });
  const sales = await prisma.saleTender.findMany({ where: { accountId } });
  const expenses = await prisma.expense.findMany({ where: { accountId } });
  const suppPayments = await prisma.supplierPayment.findMany({ where: { accountId } });
  
  let ledgerBal = Number(account.openingBalance);
  console.log("Opening:", ledgerBal);
  
  for (const s of sales) {
    ledgerBal += Number(s.amount);
    console.log("Sale In:", Number(s.amount), "->", ledgerBal);
  }
  for (const p of purchases) {
    ledgerBal -= Number(p.amount);
    console.log("Purchase Out:", Number(p.amount), "->", ledgerBal);
  }
  for (const e of expenses) {
    ledgerBal -= Number(e.amount);
    console.log("Expense Out:", Number(e.amount), "->", ledgerBal);
  }
  for (const sp of suppPayments) {
    ledgerBal -= Number(sp.amount);
    console.log("Supplier Payment Out:", Number(sp.amount), "->", ledgerBal);
  }
  
  console.log("Final Ledger Computed:", ledgerBal);
  console.log("Actual DB Balance:", Number(account.balance));
}

main().finally(() => prisma.$disconnect());
