import { PrismaClient } from "@prisma/client";
import { cache } from "../apps/dashboard/src/lib/cache";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting deletion of all Categories and related Catalog metadata...");

  try {
    // 1. Delete Categories
    // Category has self-relation, so we delete children first, then parents.
    console.log("Deleting Categories...");
    await prisma.category.deleteMany({ where: { parentId: { not: null } } });
    await prisma.category.deleteMany(); 

    // 2. Delete Brands and other metadata
    console.log("Deleting Brands, Types, Models, and Series...");
    await prisma.brand.deleteMany();
    await prisma.productType.deleteMany();
    await prisma.model.deleteMany();
    await prisma.series.deleteMany();

    // 3. Clear the cache so the UI updates immediately!
    console.log("Clearing application cache...");
    await cache.invalidateCategories();
    await cache.invalidateProducts();

    console.log("✅ Categories and Brands successfully cleaned! (Cache also cleared)");
  } catch (error) {
    console.error("❌ Error cleaning up categories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
