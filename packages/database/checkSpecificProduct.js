const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      name: { contains: "A22", mode: "insensitive" }
    }
  });
  console.log('Products:', products.map(p => p.name));
  
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { createdAt: true }
  });
  console.log('Latest Sales:', sales.map(s => s.createdAt));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
