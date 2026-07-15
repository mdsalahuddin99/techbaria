const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmrjc3cu30001i904cp2lnxiz';
  
  const sales = await prisma.saleTender.findMany({ where: { accountId } });
  for (const s of sales) {
    console.log("Sale In:", Number(s.amount), "Ref:", s.ref);
  }
}

main().finally(() => prisma.$disconnect());
