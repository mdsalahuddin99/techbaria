const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const account = await prisma.financialAccount.findUnique({
    where: { id: 'cmrjc3cu30001i904cp2lnxiz' }
  });
  console.log("Drawer 1 DB:", account);
  
  // also check other accounts to see if there's a different Cash account
  const accounts = await prisma.financialAccount.findMany();
  console.log("All accounts:", accounts.map(a => ({ id: a.id, name: a.name, balance: Number(a.balance), type: a.type })));
}

main().finally(() => prisma.$disconnect());
