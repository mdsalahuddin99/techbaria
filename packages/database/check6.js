const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmrjc3cu30001i904cp2lnxiz';
  
  const deletedSales = await prisma.auditLog.findMany({ 
    where: { entity: 'Sale', action: 'DELETE' } 
  });
  console.log("Deleted Sales Audit Logs:", deletedSales);
  
  const voidedSales = await prisma.sale.findMany({ 
    where: { status: 'VOID' } 
  });
  console.log("Voided Sales:", voidedSales.map(s => s.id));
}

main().finally(() => prisma.$disconnect());
