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
  console.log(`Using DEFAULT_SHOP_ID: ${defaultShopId}`);

  const tables = [
    { name: "User", client: prisma.user },
    { name: "Warehouse", client: prisma.warehouse },
    { name: "Category", client: prisma.category },
    { name: "CategoryBrand", client: prisma.categoryBrand },
    { name: "SubcategoryProduct", client: prisma.subcategoryProduct },
    { name: "SubcategoryModel", client: prisma.subcategoryModel },
    { name: "SubcategorySeries", client: prisma.subcategorySeries },
    { name: "Product", client: prisma.product },
    { name: "Customer", client: prisma.customer },
    { name: "CustomerTransaction", client: prisma.customerTransaction },
    { name: "Supplier", client: prisma.supplier },
    { name: "Sale", client: prisma.sale },
    { name: "HeldSale", client: prisma.heldSale },
    { name: "Purchase", client: prisma.purchase },
    { name: "SerialNumber", client: prisma.serialNumber },
    { name: "FinancialAccount", client: prisma.financialAccount },
    { name: "AccountTransfer", client: prisma.accountTransfer },
    { name: "Expense", client: prisma.expense },
    { name: "StockAdjustment", client: prisma.stockAdjustment },
    { name: "Transfer", client: prisma.transfer },
    { name: "AuditLog", client: prisma.auditLog },
    { name: "Notification", client: prisma.notification },
    { name: "CashShift", client: prisma.cashShift },
  ];

  console.log("\n--- Table Count Audit ---");
  console.log(
    `${"Table".padEnd(25)} | ${"Default Shop Count".padStart(20)} | ${"Other Shops Count".padStart(20)} | ${"Total Count".padStart(12)}`
  );
  console.log("-".repeat(85));

  for (const table of tables) {
    try {
      const defaultCount = await (table.client as any).count({
        where: { shopId: defaultShopId },
      });
      const otherCount = await (table.client as any).count({
        where: { NOT: { shopId: defaultShopId } },
      });
      const totalCount = defaultCount + otherCount;
      console.log(
        `${table.name.padEnd(25)} | ${String(defaultCount).padStart(20)} | ${String(otherCount).padStart(20)} | ${String(totalCount).padStart(12)}`
      );
    } catch (err: any) {
      console.log(`${table.name.padEnd(25)} | Error: ${err.message}`);
    }
  }

  // Also print counts for dependent tables that do not have shopId directly but cascade:
  const childTables = [
    { name: "Account", client: prisma.account },
    { name: "Session", client: prisma.session },
    { name: "ProductImage", client: prisma.productImage },
    { name: "ProductVariant", client: prisma.productVariant },
    { name: "WarehouseStock", client: prisma.warehouseStock },
    { name: "SaleItem", client: prisma.saleItem },
    { name: "SaleTender", client: prisma.saleTender },
    { name: "PurchaseItem", client: prisma.purchaseItem },
    { name: "PurchaseTender", client: prisma.purchaseTender },
    { name: "SupplierPayment", client: prisma.supplierPayment },
    { name: "TransferItem", client: prisma.transferItem },
  ];

  console.log("\n--- Child/Dependent Table Counts (Pre-Migration) ---");
  for (const table of childTables) {
    try {
      const totalCount = await (table.client as any).count();
      console.log(`${table.name.padEnd(25)} | Total: ${totalCount}`);
    } catch (err: any) {
      console.log(`${table.name.padEnd(25)} | Error: ${err.message}`);
    }
  }

  await prisma.$disconnect();
}

main();
