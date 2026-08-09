import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting COGS Migration...");

  // 1. Migrate SerialNumbers (Set cost = product.cost for IN_STOCK serials without a cost)
  console.log("Migrating SerialNumbers...");
  const serials = await prisma.serialNumber.findMany({
    where: { status: "IN_STOCK", cost: null },
    include: { product: { select: { cost: true } } }
  });

  let serialsUpdated = 0;
  for (const s of serials) {
    if (s.product) {
      await prisma.serialNumber.update({
        where: { id: s.id },
        data: { cost: s.product.cost }
      });
      serialsUpdated++;
    }
  }
  console.log(`Updated ${serialsUpdated} SerialNumbers with default costs.`);

  // 2. Migrate InventoryLots (Create a lot for current stock of non-serialized items)
  console.log("Migrating InventoryLots...");
  const products = await prisma.product.findMany({
    where: { trackSerials: false, stock: { gt: 0 } },
    include: { warehouseStocks: true }
  });

  let lotsCreated = 0;
  for (const p of products) {
    const existingLots = await prisma.inventoryLot.count({
      where: { productId: p.id }
    });

    if (existingLots === 0 && p.stock > 0) {
      if (p.warehouseStocks.length > 0) {
        // Create a lot for each warehouse
        for (const ws of p.warehouseStocks) {
          if (ws.qty > 0) {
            await prisma.inventoryLot.create({
              data: {
                productId: p.id,
                warehouseId: ws.warehouseId,
                qtyOriginal: ws.qty,
                qtyRemaining: ws.qty,
                unitCost: p.cost,
                sourceType: "MIGRATION",
              }
            });
            lotsCreated++;
          }
        }
      } else {
        // No specific warehouse, create one global lot
        await prisma.inventoryLot.create({
          data: {
            productId: p.id,
            qtyOriginal: p.stock,
            qtyRemaining: p.stock,
            unitCost: p.cost,
            sourceType: "MIGRATION",
          }
        });
        lotsCreated++;
      }
    }
  }
  console.log(`Created ${lotsCreated} InventoryLots for legacy stock.`);

  console.log("Migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
