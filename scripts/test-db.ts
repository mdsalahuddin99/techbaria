import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        warrantyMonths: true,
        warrantyStartDate: true,
      }
    });
    console.log("Products in database:");
    for (const p of products) {
      console.log(`- Name: ${p.name}`);
      console.log(`  SKU: ${p.sku}`);
      console.log(`  Warranty Months: ${p.warrantyMonths} (${typeof p.warrantyMonths})`);
      console.log(`  Warranty Start Date: ${p.warrantyStartDate}`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
