import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting deletion of all generated dummy data...");

  try {
    // 1. Delete transactions and items first (due to foreign keys)
    console.log("Deleting Warranty Claims...");
    await prisma.warrantyClaim.deleteMany();

    console.log("Deleting Sale Items & Sales...");
    await prisma.saleItem.deleteMany();
    await prisma.saleTender.deleteMany();
    await prisma.customerTransaction.deleteMany();
    await prisma.sale.deleteMany();

    console.log("Deleting Purchase Items & Purchases...");
    await prisma.purchaseItem.deleteMany();
    await prisma.purchaseTender.deleteMany();
    await prisma.supplierTransaction.deleteMany();
    await prisma.supplierPayment.deleteMany();
    await prisma.purchase.deleteMany();

    console.log("Deleting Stock Transfers & Adjustments...");
    await prisma.transferItem.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.stockAdjustment.deleteMany();

    console.log("Deleting Serial Numbers & Warehouse Stocks...");
    await prisma.serialNumber.deleteMany();
    await prisma.warehouseStock.deleteMany();

    // 2. Delete Catalog Items
    console.log("Deleting Products...");
    await prisma.productReview.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany(); // Deletes all products

    console.log("Deleting Categories, Brands, Models, Types, Series...");
    // Category has self-relation, so we delete many times to clear children
    await prisma.category.deleteMany({ where: { parentId: { not: null } } });
    await prisma.category.deleteMany(); 
    
    await prisma.brand.deleteMany();
    await prisma.productType.deleteMany();
    await prisma.model.deleteMany();
    await prisma.series.deleteMany();

    // 3. Delete Parties
    console.log("Deleting Customers and Suppliers...");
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();

    // 4. Finance & System
    console.log("Deleting Expenses & Cash Shifts...");
    await prisma.expense.deleteMany();
    await prisma.cashShift.deleteMany();

    // Note: We leave Users, Shops, Warehouses, and FinancialAccounts intact
    // so the core system doesn't break.

    console.log("✅ All dummy data and catalog completely cleaned up!");
  } catch (error) {
    console.error("❌ Error cleaning up data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
