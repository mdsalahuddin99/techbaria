const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { action: true, entity: true, entityId: true, createdAt: true }
  });
  console.log(logs);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
