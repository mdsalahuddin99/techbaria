const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmrjc3cu30001i904cp2lnxiz';
  
  const transfersOut = await prisma.accountTransfer.findMany({ where: { fromAccountId: accountId } });
  console.log("Transfers Out:", transfersOut);
  
  const transfersIn = await prisma.accountTransfer.findMany({ where: { toAccountId: accountId } });
  console.log("Transfers In:", transfersIn);
  
  const auditLogs = await prisma.auditLog.findMany({ where: { entity: 'FinancialAccount', entityId: accountId } });
  console.log("Audit Logs (Deposits/Withdraws):", auditLogs);
}

main().finally(() => prisma.$disconnect());
