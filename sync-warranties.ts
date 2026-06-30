import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching purchase items with warranty...");
  const items = await prisma.purchaseItem.findMany({
    where: { warrantyMonths: { not: null } },
    select: { productId: true, warrantyMonths: true },
    orderBy: { purchase: { createdAt: 'desc' } }, // Get the most recent warranty first
  });

  const updatedProducts = new Set<string>();

  for (const item of items) {
    if (item.warrantyMonths && !updatedProducts.has(item.productId)) {
      // Only update if the product currently has no warranty or we want to overwrite it with the most recent one
      await prisma.product.updateMany({
        where: { id: item.productId, warrantyMonths: null },
        data: { warrantyMonths: item.warrantyMonths },
      });
      console.log(`Synced product ${item.productId} to ${item.warrantyMonths} months warranty.`);
      updatedProducts.add(item.productId);
    }
  }

  console.log(`Done! Synced warranties for ${updatedProducts.size} products.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
