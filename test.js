const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      name: { contains: 'islamia', mode: 'insensitive' }
    }
  });
  console.log("Products with 'islamia':", products.map(p => p.name));
  
  const count = await prisma.product.count();
  console.log("Total products in DB:", count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
