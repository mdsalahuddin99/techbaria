import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding missing Warranty & Expected Date fields to existing Purchase Items...");

  // Get all purchase items
  const items = await prisma.purchaseItem.findMany({
    where: { warrantyMonths: null }
  });

  console.log(`Found ${items.length} items to update...`);

  let count = 0;
  for (const item of items) {
    // Generate random past date for Expected Date / Warranty Start Date
    const past = new Date();
    past.setMonth(new Date().getMonth() - Math.floor(Math.random() * 5));
    
    // Assign 12, 24, or 36 months warranty
    const months = [12, 24, 36][Math.floor(Math.random() * 3)];

    await prisma.purchaseItem.update({
      where: { id: item.id },
      data: {
        warrantyStartDate: past,
        warrantyMonths: months
      }
    });
    count++;
  }

  console.log(`✅ Successfully updated ${count} purchase items with Warranty & Expected Date!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
