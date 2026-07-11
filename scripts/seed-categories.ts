import { PrismaClient } from "@prisma/client";
import { cache } from "../apps/dashboard/src/lib/cache";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting to generate Catalog Entities...");

  // 1. Categories & Subcategories (10 Categories, ~15 Subcategories total)
  const categoriesData = [
    { name: "Smartphones", slug: "smartphones", subcategories: ["Android Phones", "iPhones"] },
    { name: "Laptops", slug: "laptops", subcategories: ["Gaming Laptops", "Ultrabooks", "MacBooks"] },
    { name: "Accessories", slug: "accessories", subcategories: ["Chargers", "Cables", "Power Banks"] },
    { name: "Audio", slug: "audio", subcategories: ["Earbuds", "Headphones"] },
    { name: "Smart Watches", slug: "smart-watches", subcategories: ["Apple Watch", "Fitness Bands"] },
    { name: "Components", slug: "components", subcategories: ["Processors", "Graphics Cards"] },
    { name: "Networking", slug: "networking", subcategories: ["Routers"] },
    { name: "Tablets", slug: "tablets", subcategories: ["iPads", "Android Tablets"] },
    { name: "Monitors", slug: "monitors", subcategories: ["Gaming Monitors", "Office Monitors"] },
    { name: "Storage", slug: "storage", subcategories: ["SSD", "HDD", "Pen Drives"] }
  ];

  console.log(`Generating ${categoriesData.length} Categories and their Subcategories...`);
  for (const catData of categoriesData) {
    const parent = await prisma.category.create({
      data: { name: catData.name, slug: catData.slug }
    });

    for (const subName of catData.subcategories) {
      await prisma.category.create({
        data: {
          name: subName,
          slug: `${catData.slug}-${subName.toLowerCase().replace(/ /g, "-")}`,
          parentId: parent.id
        }
      });
    }
  }

  // 2. Brands (10 Brands)
  const brands = [
    "Apple", "Samsung", "Xiaomi", "OnePlus", "Asus", 
    "HP", "Dell", "Sony", "Logitech", "Corsair"
  ];
  console.log(`Generating ${brands.length} Brands...`);
  for (const brand of brands) {
    await prisma.brand.create({ data: { name: brand } });
  }

  // 3. Product Names / Types (10 Product Types)
  const productTypes = [
    "iPhone 15 Pro Max", "Galaxy S24 Ultra", "MacBook Pro 16", "ROG Zephyrus G14", "AirPods Pro",
    "ThinkPad X1 Carbon", "PlayStation 5", "MX Master 3S", "RTX 4090", "Odyssey G9"
  ];
  console.log(`Generating ${productTypes.length} Product Names/Types...`);
  for (const type of productTypes) {
    await prisma.productType.create({ data: { name: type } });
  }

  // 4. Models (10 Models)
  const models = [
    "A2849", "SM-S928B", "MK183LL/A", "GA402XZ", "MTJV3AM/A",
    "21CB000GUS", "CFI-1215A", "910-006556", "VCG409024TFXPB1", "LC49G95TSSNXZA"
  ];
  console.log(`Generating ${models.length} Models...`);
  for (const model of models) {
    await prisma.model.create({ data: { name: model } });
  }

  // 5. Series (10 Series)
  const series = [
    "Pro Max Series", "Galaxy S Series", "M-Series Chips", "ROG Series", "AirPods Series",
    "ThinkPad Series", "Next-Gen Console", "Master Series", "RTX 40 Series", "Odyssey Series"
  ];
  console.log(`Generating ${series.length} Series...`);
  for (const s of series) {
    await prisma.series.create({ data: { name: s } });
  }

  console.log("Clearing cache...");
  await cache.invalidateCategories();

  console.log("✅ Successfully generated Categories, Subcategories, Brands, Product Names, Models, and Series!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
