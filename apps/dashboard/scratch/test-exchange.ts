try {
  const mod = require.resolve('server-only');
  require.cache[mod] = { exports: {} } as any;
} catch (e) {}
import { PrismaClient } from "@prisma/client";
import { salesService } from "../src/server/services/salesService";
import type { Ctx } from "../src/server/lib/ctx";
import assert from "assert";

const prisma = new PrismaClient();

async function run() {
  console.log("Starting exchange test...");
  
  const ctx: Ctx = {
    userId: "test-user-id",
    role: "ADMIN",
    permissions: [],
  };

  try {
    // Ensure test user exists or mock it
    const testUser = await prisma.user.upsert({
      where: { email: "test-exchange@example.com" },
      update: {},
      create: {
        id: "test-user-id",
        email: "test-exchange@example.com",
        name: "Test User",
        passwordHash: "dummy",
        role: "ADMIN",
      }
    });

    console.log("1. Creating test products...");
    const productA = await prisma.product.create({
      data: {
        name: "Test Return Item",
        barcode: "RET-123-" + Date.now(),
        price: 100,
        cost: 50,
        stock: 10,
        trackSerials: false,
        sku: "RET-123",
        slug: "ret-123-" + Date.now(),
      }
    });

    const productB = await prisma.product.create({
      data: {
        name: "Test New Item",
        barcode: "NEW-123-" + Date.now(),
        price: 150,
        cost: 80,
        stock: 10,
        trackSerials: false,
        sku: "NEW-123",
        slug: "new-123-" + Date.now(),
      }
    });

    console.log("2. Creating a test sale...");
    const sale = await salesService.create(ctx, {
      customerId: null,
      items: [
        {
          productId: productA.id,
          name: productA.name,
          qty: 1,
          price: 100,
          discount: 0,
        }
      ],
      tenders: [
        { type: "CASH", amount: 100 }
      ],
      channel: "POS"
    });

    console.log(`Sale created with ID: ${sale.id}`);

    const stockABefore = (await prisma.product.findUnique({ where: { id: productA.id } }))!.stock;
    const stockBBefore = (await prisma.product.findUnique({ where: { id: productB.id } }))!.stock;
    
    assert.strictEqual(Number(stockABefore), 9, "Product A stock should be 9 after sale");
    assert.strictEqual(Number(stockBBefore), 10, "Product B stock should be 10 initially");

    console.log("3. Executing exchange...");
    // Return 1 of A, get 1 of B
    // Product A was $100. Product B is $150.
    // Net difference: 150 - 100 = 50 owed by customer
    const exchangeResult = await salesService.exchange(ctx, {
      originalSaleId: sale.id,
      returnItems: [
        {
          productId: productA.id,
          qty: 1,
          restock: true,
        }
      ],
      newItems: [
        {
          productId: productB.id,
          qty: 1,
          price: 150,
          discount: 0,
        }
      ],
      tenders: [
        { type: "CASH", amount: 50 } // Customer pays remaining 50
      ],
      reason: "Customer changed mind",
    });

    console.log("Exchange completed successfully.");

    console.log("4. Verifying stock and accounting...");
    const stockAAfter = (await prisma.product.findUnique({ where: { id: productA.id } }))!.stock;
    const stockBAfter = (await prisma.product.findUnique({ where: { id: productB.id } }))!.stock;

    console.log(`Product A Stock: ${stockABefore} -> ${stockAAfter} (Expected: 10)`);
    console.log(`Product B Stock: ${stockBBefore} -> ${stockBAfter} (Expected: 9)`);

    assert.strictEqual(Number(stockAAfter), 10, "Product A stock was not restocked correctly.");
    assert.strictEqual(Number(stockBAfter), 9, "Product B stock was not decreased correctly.");

    const updatedOriginalSale = await prisma.sale.findUnique({ where: { id: sale.id } });
    assert.strictEqual(updatedOriginalSale!.status, "EXCHANGED", "Original sale status not updated.");
    
    const newSale = await prisma.sale.findUnique({ where: { id: exchangeResult.id }, include: { tenders: true } });
    console.log(`New Sale ID: ${newSale!.id}`);
    console.log(`New Sale Subtotal: ${newSale!.subtotal}, Total: ${newSale!.total}, Paid: ${newSale!.paid}, Due: ${newSale!.due}`);
    assert.strictEqual(Number(newSale!.total), 150, "New sale total mismatch");
    assert.strictEqual(Number(newSale!.paid), 150, "New sale paid amount mismatch (100 returned + 50 new cash)");
    assert.strictEqual(Number(newSale!.due), 0, "New sale due mismatch");

    console.log("✅ All tests passed successfully!");

    // Clean up
    console.log("Cleaning up test data...");
    await prisma.sale.delete({ where: { id: newSale!.id } });
    await prisma.sale.delete({ where: { id: sale.id } });
    await prisma.product.deleteMany({ where: { id: { in: [productA.id, productB.id] } } });
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
