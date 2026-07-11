import { PrismaClient } from "@prisma/client";
import { inventoryService } from "../apps/dashboard/src/server/services/inventoryService";
import { list as listSales } from "../apps/dashboard/src/server/services/sales/queries";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing inventoryService.listAdjustments...");
  try {
    const adj = await inventoryService.listAdjustments({ userId: "system", role: "ADMIN" } as any, { limit: 10 });
    console.log("✅ Adjustments OK. Count:", adj.items.length);
  } catch (e: any) {
    console.error("❌ Adjustments Crash:", e.message, e.stack);
  }

  console.log("\nTesting salesService.list...");
  try {
    const sales = await listSales({ userId: "system", role: "ADMIN" } as any, { limit: 10 }, {});
    console.log("✅ Sales OK. Count:", sales.items.length);
  } catch (e: any) {
    console.error("❌ Sales Crash:", e.message, e.stack);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
