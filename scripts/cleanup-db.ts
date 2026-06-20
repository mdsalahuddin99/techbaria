import { PrismaClient } from "@prisma/client";

import * as fs from "fs";
import * as path from "path";

// Load .env.local if present
try {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const envLocal = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of envLocal.split("\n")) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        // remove surrounding quotes if any
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load .env.local file:", e);
}

const prisma = new PrismaClient();

async function main() {
  const defaultShopId = process.env.DEFAULT_SHOP_ID;
  if (!defaultShopId) {
    console.error("Error: DEFAULT_SHOP_ID is not set in environment.");
    process.exit(1);
  }
  console.log(`Starting cleanup using DEFAULT_SHOP_ID: ${defaultShopId}`);

  try {
    // 1. Delete dependent/child tables for non-default shop entities
    console.log("Cleaning up dependent records...");

    // WarehouseStock
    await prisma.$executeRaw`
      DELETE FROM "WarehouseStock" 
      WHERE "warehouseId" IN (
        SELECT id FROM "Warehouse" WHERE "shopId" != ${defaultShopId}
      )
    `;

    // ProductImage and ProductVariant
    await prisma.$executeRaw`
      DELETE FROM "ProductImage" 
      WHERE "productId" IN (
        SELECT id FROM "Product" WHERE "shopId" != ${defaultShopId}
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM "ProductVariant" 
      WHERE "productId" IN (
        SELECT id FROM "Product" WHERE "shopId" != ${defaultShopId}
      )
    `;

    // SaleItem and SaleTender
    await prisma.$executeRaw`
      DELETE FROM "SaleItem" 
      WHERE "saleId" IN (
        SELECT id FROM "Sale" WHERE "shopId" != ${defaultShopId}
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM "SaleTender" 
      WHERE "saleId" IN (
        SELECT id FROM "Sale" WHERE "shopId" != ${defaultShopId}
      )
    `;

    // PurchaseItem, PurchaseTender and SupplierPayment
    await prisma.$executeRaw`
      DELETE FROM "PurchaseItem" 
      WHERE "purchaseId" IN (
        SELECT id FROM "Purchase" WHERE "shopId" != ${defaultShopId}
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM "PurchaseTender" 
      WHERE "purchaseId" IN (
        SELECT id FROM "Purchase" WHERE "shopId" != ${defaultShopId}
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM "SupplierPayment" 
      WHERE "supplierId" IN (
        SELECT id FROM "Supplier" WHERE "shopId" != ${defaultShopId}
      )
    `;

    // TransferItem
    await prisma.$executeRaw`
      DELETE FROM "TransferItem" 
      WHERE "transferId" IN (
        SELECT id FROM "Transfer" WHERE "shopId" != ${defaultShopId}
      )
    `;

    // Account and Session
    await prisma.$executeRaw`
      DELETE FROM "Account" 
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "shopId" != ${defaultShopId}
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM "Session" 
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "shopId" != ${defaultShopId}
      )
    `;

    console.log("Dependent records cleaned.");

    // 2. Delete primary entities with shopId != DEFAULT_SHOP_ID
    const tablesWithShopId = [
      "User",
      "Branch",
      "Warehouse",
      "Category",
      "CategoryBrand",
      "SubcategoryProduct",
      "SubcategoryModel",
      "SubcategorySeries",
      "Product",
      "Customer",
      "CustomerTransaction",
      "Supplier",
      "Sale",
      "HeldSale",
      "Purchase",
      "SerialNumber",
      "FinancialAccount",
      "AccountTransfer",
      "Expense",
      "StockAdjustment",
      "Transfer",
      "AuditLog",
      "Notification",
      "CashShift",
    ];

    console.log("Cleaning main tenant-specific tables...");
    for (const table of tablesWithShopId) {
      const deleted = await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "shopId" != $1`,
        defaultShopId
      );
      console.log(`- Deleted ${deleted} rows from ${table}`);
    }

    // 3. Delete non-default shops from Shop table
    const deletedShops = await prisma.$executeRaw`
      DELETE FROM "Shop" WHERE id != ${defaultShopId}
    `;
    console.log(`Deleted ${deletedShops} non-default Shop records.`);

    console.log("\nCleanup completed successfully!");
  } catch (err) {
    console.error("Error running cleanup script:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
