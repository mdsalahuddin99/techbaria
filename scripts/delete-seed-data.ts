import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting deletion of seed/demo data from database...");

  try {
    // 1. Delete dependent/child table records referencing seed products
    console.log("- Cleaning WarehouseStock referencing seed products...");
    await prisma.warehouseStock.deleteMany({
      where: { productId: { startsWith: "seed-prod-" } }
    });

    console.log("- Cleaning SerialNumber referencing seed products...");
    await prisma.serialNumber.deleteMany({
      where: { productId: { startsWith: "seed-prod-" } }
    });

    console.log("- Cleaning ProductImage referencing seed products...");
    await prisma.productImage.deleteMany({
      where: { productId: { startsWith: "seed-prod-" } }
    });

    console.log("- Cleaning ProductVariant referencing seed products...");
    await prisma.productVariant.deleteMany({
      where: { productId: { startsWith: "seed-prod-" } }
    });

    console.log("- Cleaning SaleItem referencing seed products...");
    await prisma.saleItem.deleteMany({
      where: { productId: { startsWith: "seed-prod-" } }
    });

    console.log("- Cleaning PurchaseItem referencing seed products...");
    await prisma.purchaseItem.deleteMany({
      where: { productId: { startsWith: "seed-prod-" } }
    });

    // 2. Delete main entities starting with "seed-"
    console.log("- Deleting seed Products...");
    const productsDel = await prisma.product.deleteMany({
      where: { id: { startsWith: "seed-prod-" } }
    });
    console.log(`  Deleted ${productsDel.count} products.`);

    console.log("- Deleting seed Categories...");
    const categoriesDel = await prisma.category.deleteMany({
      where: { id: { startsWith: "seed-cat-" } }
    });
    console.log(`  Deleted ${categoriesDel.count} categories.`);

    console.log("- Deleting Customer transactions for seed customers...");
    await prisma.customerTransaction.deleteMany({
      where: { customerId: { startsWith: "seed-cus-" } }
    });

    console.log("- Deleting seed Customers...");
    const customersDel = await prisma.customer.deleteMany({
      where: { id: { startsWith: "seed-cus-" } }
    });
    console.log(`  Deleted ${customersDel.count} customers.`);

    console.log("- Deleting seed Suppliers...");
    const suppliersDel = await prisma.supplier.deleteMany({
      where: { id: { startsWith: "seed-sup-" } }
    });
    console.log(`  Deleted ${suppliersDel.count} suppliers.`);

    console.log("- Deleting seed Financial Accounts...");
    const accountsDel = await prisma.financialAccount.deleteMany({
      where: { id: { startsWith: "seed-acc-" } }
    });
    console.log(`  Deleted ${accountsDel.count} accounts.`);

    console.log("\n✅ All seed data removed successfully!");
  } catch (error) {
    console.error("❌ Error deleting seed data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
