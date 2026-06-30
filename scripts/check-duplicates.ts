import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  console.log(`Total categories: ${categories.length}`);
  
  const brands = await prisma.categoryBrand.findMany();
  console.log(`Total brands: ${brands.length}`);

  const products = await prisma.subcategoryProduct.findMany();
  console.log(`Total products: ${products.length}`);

  // check for duplicates in brands
  const brandCounts = brands.reduce((acc, curr) => {
    acc[curr.name] = (acc[curr.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const duplicateBrands = Object.entries(brandCounts).filter(([_, count]) => count > 1);
  console.log("Duplicate brands:", duplicateBrands);
}

main().catch(console.error).finally(() => prisma.$disconnect());
