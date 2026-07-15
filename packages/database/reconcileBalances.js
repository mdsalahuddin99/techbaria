const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Fix double-counted SaleTenders
  const doubleCounted = await prisma.saleTender.findMany({
    where: {
      ref: { contains: 'COLLECT' }
    }
  });
  
  console.log(`Found ${doubleCounted.length} double-counted SaleTenders. Nullifying accountId...`);
  
  for (const st of doubleCounted) {
    await prisma.saleTender.update({
      where: { id: st.id },
      data: { accountId: null }
    });
  }
  
  // 2. Compute correct balance for all accounts based on fixed data
  const accounts = await prisma.financialAccount.findMany();
  for (const account of accounts) {
    const accountId = account.id;
    let balance = Number(account.openingBalance);

    // Sales (now excluding the double counted ones because accountId is null)
    const sales = await prisma.saleTender.findMany({ where: { accountId } });
    for (const s of sales) balance += Number(s.amount);

    // Purchases
    const purchases = await prisma.purchaseTender.findMany({ where: { accountId } });
    for (const p of purchases) balance -= Number(p.amount);

    // Expenses
    const expenses = await prisma.expense.findMany({ where: { accountId } });
    for (const e of expenses) balance -= Number(e.amount);

    // Supplier Payments
    const suppPayments = await prisma.supplierPayment.findMany({ where: { accountId } });
    for (const sp of suppPayments) balance -= Number(sp.amount);

    // Transfers
    const transfersOut = await prisma.accountTransfer.findMany({ where: { fromAccountId: accountId } });
    for (const to of transfersOut) balance -= Number(to.amount);

    const transfersIn = await prisma.accountTransfer.findMany({ where: { toAccountId: accountId } });
    for (const ti of transfersIn) balance += Number(ti.amount);

    // AuditLogs (Manual Deposits/Withdraws)
    const auditLogs = await prisma.auditLog.findMany({ where: { entity: 'FinancialAccount', entityId: accountId, action: { in: ['DEPOSIT', 'WITHDRAW'] } } });
    for (const log of auditLogs) {
      const amount = Number(log.diff?.amount) || 0;
      if (log.action === 'DEPOSIT') balance += amount;
      else if (log.action === 'WITHDRAW') balance -= amount;
    }

    // Customer Wallet Txs
    const custTxs = await prisma.customerTransaction.findMany({ where: { accountId } });
    for (const ct of custTxs) {
      if (ct.type === "PAYMENT" || ct.type === "ADJUSTMENT") balance += Number(ct.amount);
      else if (ct.type === "REFUND") balance -= Number(ct.amount);
    }
    
    // Supplier Wallet Txs
    const suppTxs = await prisma.supplierTransaction.findMany({ where: { accountId } });
    for (const st of suppTxs) {
      if (st.type === "REFUND") balance += Number(st.amount);
      else if (st.type === "PAYMENT" || st.type === "ADJUSTMENT") balance -= Number(st.amount);
    }

    // Update
    if (balance !== Number(account.balance)) {
      console.log(`Updating ${account.name}: ${account.balance} -> ${balance}`);
      await prisma.financialAccount.update({ where: { id: accountId }, data: { balance } });
    } else {
      console.log(`Skipping ${account.name}, already correct: ${balance}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
