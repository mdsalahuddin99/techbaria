const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmrjc3cu30001i904cp2lnxiz';
  
  const custTxs = await prisma.customerTransaction.findMany({ where: { accountId } });
  for (const ct of custTxs) {
    console.log("CustTx In:", Number(ct.amount), "Ref:", ct.reference);
  }
}

main().finally(() => prisma.$disconnect());
