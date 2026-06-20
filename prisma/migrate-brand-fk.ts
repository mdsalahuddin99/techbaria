/**
 * Safe data migration script.
 *
 * Reads existing `brand`, `model`, `series` string columns from the Product table,
 * creates the corresponding FK records in CategoryBrand / SubcategoryModel / SubcategorySeries,
 * updates the FK columns on each Product row, then pushes the schema
 * (dropping the old string columns automatically).
 *
 * Run: npx tsx prisma/migrate-brand-fk.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── 1. Read all products that have the old string columns ────────────────────
  const rawProducts = await prisma.$queryRawUnsafe<
    {
      id: string;
      shopId: string;
      categoryId: string | null;
      brand: string | null;
      model: string | null;
      series: string | null;
    }[]
  >(`
    SELECT id, "shopId", "categoryId", brand, model, series
    FROM "Product"
    WHERE brand IS NOT NULL
  `);

  console.log(`\n📦 Found ${rawProducts.length} products with legacy brand/model/series strings.\n`);

  if (rawProducts.length === 0) {
    console.log("✅ Nothing to migrate.");
    return;
  }

  // ── 2. Add new FK columns to the database if they don't exist ───────────────
  console.log("🔧 Adding FK columns to Product table (if not already present)...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "brandId"  TEXT,
      ADD COLUMN IF NOT EXISTS "modelId"  TEXT,
      ADD COLUMN IF NOT EXISTS "seriesId" TEXT
  `);
  console.log("  ✓ FK columns ready.\n");

  for (const p of rawProducts) {
    if (!p.brand) continue;

    // We need a categoryId; if null, we'll use a generic fallback bucket.
    // In the new schema CategoryBrand requires a categoryId.
    // If the product has no category, we'll skip FK resolution for brand.
    if (!p.categoryId) {
      console.warn(`  ⚠️  Product ${p.id} has brand "${p.brand}" but no categoryId — skipping FK link.`);
      continue;
    }

    // 2a. Upsert CategoryBrand
    const brand = await prisma.categoryBrand.upsert({
      where: { categoryId_name: { categoryId: p.categoryId, name: p.brand } },
      create: { categoryId: p.categoryId, name: p.brand },
      update: {},
    });
    console.log(`  ✓ Brand: "${p.brand}" → ${brand.id}`);

    let modelId: string | null = null;
    let seriesId: string | null = null;

    if (p.model) {
      // 2b. Upsert SubcategoryProduct (the pivot between brand and model)
      // SubcategoryModel requires a productId (SubcategoryProduct).
      // We'll create a SubcategoryProduct with the product name if needed.
      const productName = await prisma.product.findUnique({ where: { id: p.id }, select: { name: true } });
      const subProduct = await prisma.subcategoryProduct.upsert({
        where: { brandId_name: { brandId: brand.id, name: productName?.name ?? p.id } },
        create: { brandId: brand.id, name: productName?.name ?? p.id },
        update: {},
      });

      const subModel = await prisma.subcategoryModel.upsert({
        where: { productId_name: { productId: subProduct.id, name: p.model } },
        create: { productId: subProduct.id, name: p.model },
        update: {},
      });
      modelId = subModel.id;
      console.log(`    ✓ Model: "${p.model}" → ${modelId}`);

      if (p.series) {
        const subSeries = await prisma.subcategorySeries.upsert({
          where: { modelId_name: { modelId: subModel.id, name: p.series } },
          create: { modelId: subModel.id, name: p.series },
          update: {},
        });
        seriesId = subSeries.id;
        console.log(`      ✓ Series: "${p.series}" → ${seriesId}`);
      }
    }

    // 2c. Update the Product row with the new FK values
    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET "brandId" = $1, "modelId" = $2, "seriesId" = $3 WHERE id = $4`,
      brand.id,
      modelId,
      seriesId,
      p.id,
    );
    console.log(`    ↳ Product ${p.id} updated with brandId=${brand.id} modelId=${modelId} seriesId=${seriesId}\n`);
  }

  console.log("\n✅ Data migration complete. Run `npx prisma db push --accept-data-loss` to drop the old string columns.\n");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
