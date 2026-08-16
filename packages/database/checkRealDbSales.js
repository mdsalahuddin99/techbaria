const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Latest 5 Sales in DB:');
  for (const s of sales) {
    console.log(`- ID: ${s.id}, Date: ${s.createdAt}, Total: ${s.total}`);
  }
}

main().then(() => process.exit(0)).catch(console.error);
