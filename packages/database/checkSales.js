const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, total: true, status: true }
  });
  console.log(sales);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
