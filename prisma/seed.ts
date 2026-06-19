/**
 * Seed script — creates demo data for development.
 *
 * Usage: npx prisma db seed
 *
 * Run after `npx prisma migrate dev` to populate a fresh database
 * with sample categories, products, accounts, customers, and suppliers.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shopId = "cmq2fdepr0000uel0qfuj2vg7";
  const userId = "cmq2fdh4z0004uel0pq0fituq";

  // ── Upsert Shop ──────────────────────────────────────────────────────
  const existingShop = await prisma.shop.findUnique({ where: { id: shopId } });
  let shop;
  
  if (existingShop) {
    shop = existingShop;
  } else {
    shop = await prisma.shop.create({
      data: {
        id: shopId,
        name: "Demo Shop",
        slug: "demo-shop-" + Date.now(),
        currency: "BDT",
        timezone: "Asia/Dhaka",
      },
    });
  }

  // ── Upsert User ──────────────────────────────────────────────────────
  const passwordHash = "scrypt:16384:8:1:5b73bba97b2e448ac6282d4fb1ec0236f3e629f874a17fadaab8d0a7eb3fef36$233ee50a6a6c33f1625c9be87c2729aa2be49990e084271d0f27076af2c20ffb866ad3aa726daf8de6d16a5a2f22e202076bd89c06a393eab18c88a664887367";
  
  // Check if user exists with this email or id
  const existingUserById = await prisma.user.findUnique({ where: { id: userId } });
  const existingUserByEmail = await prisma.user.findUnique({ where: { email: "admin@demo.com" } });
  
  if (existingUserById) {
    // Update existing user
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, shopId }
    });
  } else if (existingUserByEmail) {
    // Update existing user by email to have correct shopId
    await prisma.user.update({
      where: { email: "admin@demo.com" },
      data: { id: userId, passwordHash, shopId }
    });
  } else {
    // Create new user
    await prisma.user.create({
      data: {
        id: userId,
        name: "Admin User",
        email: "admin@demo.com",
        role: "OWNER",
        shopId,
        passwordHash,
      },
    });
  }

  // ── Categories ───────────────────────────────────────────────────────
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Accessories", slug: "accessories" },
    { name: "Cables", slug: "cables" },
    { name: "Mobile Phone Parts", slug: "mobile-parts" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: `seed-cat-${cat.slug}` },
      update: {},
      create: { id: `seed-cat-${cat.slug}`, shopId, ...cat },
    });
  }

  // ── Products ─────────────────────────────────────────────────────────
  const products = [
    { name: "USB-C Cable 1m", sku: "USB-C-1M", price: 150, cost: 100, stock: 50, categorySlug: "cables" },
    { name: "Lightning Cable 1m", sku: "LIG-1M", price: 250, cost: 180, stock: 30, categorySlug: "cables" },
    { name: "Phone Case iPhone 15", sku: "CASE-IP15", price: 350, cost: 200, stock: 20, categorySlug: "accessories" },
    { name: "Wireless Mouse", sku: "MSE-WL", price: 550, cost: 400, stock: 15, categorySlug: "electronics" },
    { name: "Screen Protector", sku: "SCRN-PRO", price: 100, cost: 50, stock: 100, categorySlug: "accessories" },
  ];

  for (const p of products) {
    const cat = await prisma.category.findFirst({ where: { slug: p.categorySlug, shopId } });
    await prisma.product.upsert({
      where: { id: `seed-prod-${p.sku}` },
      update: {},
      create: {
        id: `seed-prod-${p.sku}`,
        shopId,
        name: p.name,
        sku: p.sku,
        slug: p.sku.toLowerCase(),
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        reorderLevel: 5,
        unit: "pc",
        isPublished: true,
        categoryId: cat?.id,
      },
    });
  }

  // ── Financial Accounts ───────────────────────────────────────────────
  const accounts: Array<{ name: string; type: string }> = [
    { name: "Cash Drawer", type: "CASH" },
    { name: "Bank Account", type: "BANK" },
    { name: "bKash", type: "MOBILE_BANKING" },
  ];

  for (const a of accounts) {
    await prisma.financialAccount.upsert({
      where: { id: `seed-acc-${a.type}` },
      update: {},
       
      create: { id: `seed-acc-${a.type}`, shopId, name: a.name, type: a.type as any, openingBalance: 0, balance: 0 },
    });
  }

  // ── Customers ────────────────────────────────────────────────────────
  const customers = [
    { name: "Walk-in Customer", phone: "01700000002" },
    { name: "John Doe", phone: "01700000003" },
    { name: "Jane Smith", phone: "01700000004" },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: `seed-cus-${c.phone}` },
      update: {},
      create: { id: `seed-cus-${c.phone}`, shopId, name: c.name, phone: c.phone },
    });
  }

  // ── Suppliers ────────────────────────────────────────────────────────
  const suppliers = [
    { name: "Tech Supplier BD", phone: "01700000005" },
    { name: "Mobile Parts Ltd", phone: "01700000006" },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { id: `seed-sup-${s.phone}` },
      update: {},
      create: { id: `seed-sup-${s.phone}`, shopId, name: s.name, phone: s.phone },
    });
  }

  console.log("✅ Seed complete:");
  console.log(`   Shop: ${shop.name}`);
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Accounts: ${accounts.length}`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Suppliers: ${suppliers.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
