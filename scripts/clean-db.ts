import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDB() {
  console.log("🧹 Wiping all dummy data from the database...");

  // Delete in correct order to avoid foreign key constraints
  
  // 1. Transactions & Adjustments
  await prisma.supplierPayment.deleteMany({});
  await prisma.customerPayment.deleteMany({});
  await prisma.financialTransaction.deleteMany({});
  
  await prisma.stockAdjustment.deleteMany({});
  await prisma.warehouseStock.deleteMany({});
  await prisma.serialNumber.deleteMany({});
  
  // 2. Sales & Purchases
  await prisma.saleItem.deleteMany({});
  await prisma.saleTender.deleteMany({});
  await prisma.sale.deleteMany({});
  
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchaseTender.deleteMany({});
  await prisma.purchase.deleteMany({});
  
  await prisma.restockItem.deleteMany({});
  await prisma.restockOrder.deleteMany({});
  
  // 3. Products
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  
  // 4. Categories, Brands, Models, Series
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.model.deleteMany({});
  await prisma.series.deleteMany({});
  await prisma.productType.deleteMany({});
  
  // 5. Entities (Customers, Suppliers, Warehouses, Accounts)
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.financialAccount.deleteMany({});
  
  console.log("✅ Database completely wiped and ready for fresh seed!");
}

cleanDB()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
