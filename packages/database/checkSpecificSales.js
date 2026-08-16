const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.saleItem.findMany({
    where: {
      name: { contains: "SAMSUNG A22 4G" }
    },
    include: { sale: true },
    orderBy: { sale: { createdAt: 'desc' } }
  });
  console.log(items.map(i => ({
    name: i.name,
    qty: i.qty,
    saleCreatedAt: i.sale.createdAt,
    saleId: i.saleId
  })));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
