/**
 * One-time cleanup script: deletes orphaned IN_STOCK serial numbers
 * whose products have stock = 0 (left behind after purchases were deleted
 * without reversing inventory).
 *
 * Run: npx tsx scripts/cleanup-orphaned-serials.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["query", "error"] });

async function main() {
  console.log("🔍 Finding orphaned IN_STOCK serials...\n");

  // Find all IN_STOCK serials where the product's stock is 0 or negative
  // and the serial is not linked to any sale
  const orphaned = await prisma.serialNumber.findMany({
    where: {
      status: "IN_STOCK",
      saleItemId: null,
      product: {
        stock: { lte: 0 },
      },
    },
    select: {
      id: true,
      serial: true,
      productId: true,
      product: { select: { name: true, stock: true } },
    },
  });

  if (orphaned.length === 0) {
    console.log("✅ No orphaned serials found. Database is clean!");
    return;
  }

  console.log(`Found ${orphaned.length} orphaned serial(s):\n`);
  for (const s of orphaned) {
    console.log(`  - ${s.serial} (product: "${s.product.name}", stock: ${s.product.stock})`);
  }

  console.log("\n🗑️  Deleting orphaned serials...");
  const result = await prisma.serialNumber.deleteMany({
    where: {
      id: { in: orphaned.map((s) => s.id) },
    },
  });

  console.log(`\n✅ Deleted ${result.count} orphaned serial(s).`);

  // Invalidate product cache (if using file-based cache)
  const affectedProductIds = [...new Set(orphaned.map((s) => s.productId))];
  console.log(`\n📦 Affected products: ${affectedProductIds.join(", ")}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
