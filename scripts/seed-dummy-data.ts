import { 
  PrismaClient, TenderType, SaleChannel, SaleStatus, SupplierTxType, 
  TransactionType, SerialStatus, AccountType, AdjustmentReason, 
  TransferStatus, ClaimStatus, ClaimType 
} from "@prisma/client";

const prisma = new PrismaClient();

// --- Helpers ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];
const randomDateLast5Months = () => {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - 5);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
};

async function main() {
  console.log("Generating 5-MONTH COMPREHENSIVE Dummy Data. This may take a minute...");
  const prefix = "TB-" + Date.now().toString().slice(-4);

  // 1. Core Setup (Warehouses, Accounts, Users)
  console.log("Setting up Core Entities (Warehouses, Accounts, Users)...");
  
  // Warehouses
  const warehouses = [];
  const whNames = ["Main Warehouse", "Dhanmondi Branch", "Uttara Branch"];
  for (const name of whNames) {
    const w = await prisma.warehouse.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true }
    });
    warehouses.push(w);
  }

  // User
  let user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) {
    user = await prisma.user.create({ data: { email: `admin-${prefix}@test.com`, name: "System Admin", role: "ADMIN", active: true } });
  }

  // Financial Accounts
  const accounts = [];
  const accTypes = [
    { name: "Main Cash Drawer", type: AccountType.CASH },
    { name: "City Bank", type: AccountType.BANK },
    { name: "bKash Merchant", type: AccountType.MOBILE_BANKING }
  ];
  for (const acc of accTypes) {
    const a = await prisma.financialAccount.upsert({
      where: { id: acc.name.replace(/\s/g, "") }, // Simple mock id
      update: {},
      create: { name: acc.name, type: acc.type, balance: randomInt(50000, 500000) }
    }).catch(async () => {
       // fallback if ID approach fails due to schema
       return await prisma.financialAccount.create({ data: { name: acc.name + " " + prefix, type: acc.type, balance: randomInt(50000, 500000) }});
    });
    accounts.push(a);
  }

  // 2. Parties (Customers & Suppliers)
  console.log("Generating Customers and Suppliers...");
  const customers = [];
  for (let i = 1; i <= 30; i++) {
    const c = await prisma.customer.create({
      data: { 
        name: `Customer ${i} ${prefix}`, 
        phone: `017${randomInt(10000000, 99999999)}`,
        address: "Dhaka, Bangladesh",
        createdAt: randomDateLast5Months()
      }
    });
    customers.push(c);
  }

  const suppliers = [];
  for (let i = 1; i <= 10; i++) {
    const s = await prisma.supplier.create({
      data: { 
        name: `Supplier ${i} ${prefix}`, 
        phone: `018${randomInt(10000000, 99999999)}`,
        createdAt: randomDateLast5Months()
      }
    });
    suppliers.push(s);
  }

  // 3. Catalog (Categories, Brands, ProductTypes, Models, Series)
  console.log("Generating Catalog Data...");
  const catNames = ["Smartphones", "Laptops", "Accessories"];
  const subCats = { "Smartphones": ["Flagship", "Budget"], "Laptops": ["Gaming", "Office"], "Accessories": ["Chargers", "Cables"] };
  const categories = [];
  for (const name of catNames) {
    const parent = await prisma.category.create({ data: { name, slug: `${name.toLowerCase()}-${prefix}`, isPublished: true }});
    categories.push(parent);
    for (const sub of subCats[name as keyof typeof subCats]) {
      await prisma.category.create({ data: { name: sub, slug: `${sub.toLowerCase()}-${parent.id}`, parentId: parent.id, isPublished: true }});
    }
  }

  const brands = [];
  for (const name of ["Apple", "Samsung", "Asus", "Anker"]) {
    brands.push(await prisma.brand.create({ data: { name: `${name} ${prefix}`, isPublished: true }}));
  }

  const productTypes = [];
  for (const name of ["Device", "Accessory", "Parts"]) {
    productTypes.push(await prisma.productType.create({ data: { name: `${name} ${prefix}`, isPublished: true }}));
  }

  const models = [];
  for (const name of ["Pro", "Max", "Lite", "Ultra"]) {
    models.push(await prisma.model.create({ data: { name: `${name} ${prefix}`, isPublished: true }}));
  }

  const seriesList = [];
  for (const name of ["Series X", "Series S", "Alpha", "Beta"]) {
    seriesList.push(await prisma.series.create({ data: { name: `${name} ${prefix}`, isPublished: true }}));
  }

  // 4. Products
  console.log("Generating 100 Products...");
  const products = [];
  for (let i = 1; i <= 100; i++) {
    const cost = randomInt(500, 50000);
    const parentCat = randomItem(categories);
    const availableSubCats = subCats[parentCat.name as keyof typeof subCats] || [];
    const subcategoryName = availableSubCats.length > 0 ? randomItem(availableSubCats) : null;
    const category = randomItem(categories);
    const parentCategory = category.parentId ? categories.find(c => c.id === category.parentId) : category;

    const p = await prisma.product.create({
      data: {
        name: `Product ${i} ${prefix}`,
        sku: `SKU-${prefix}-${i}`,
        slug: `prod-${prefix}-${i}`,
        categoryId: parentCategory?.id || category.id,
        subcategory: category.parentId ? category.name : undefined,
        globalBrandId: randomItem(brands).id,
        productTypeId: randomItem(productTypes).id,
        globalModelId: randomItem(models).id,
        globalSeriesId: randomItem(seriesList).id,
        supplierId: randomItem(suppliers).id,
        cost: cost,
        price: cost * 1.2,
        onlinePrice: cost * 1.15,
        trackSerials: true,
        isPublished: true,
        createdAt: randomDateLast5Months(),
        stock: 0 // Will be populated by purchases
      }
    });
    products.push(p);
  }

  let serialCounter = 1;

  // 5. Purchases (Past 5 Months)
  console.log("Generating 40 Purchases (Inventory In)...");
  for (let i = 1; i <= 40; i++) {
    const supplier = randomItem(suppliers);
    const warehouse = randomItem(warehouses);
    const date = randomDateLast5Months();
    const purchaseItems = [];
    let total = 0;

    // Pick 2-5 UNIQUE products to avoid duplicate rows for the same product in a purchase
    const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffledProducts.slice(0, randomInt(2, 5));
    
    for (const p of selectedProducts) {
      const qty = randomInt(5, 20);
      const serials = [];
      const prefix = p.sku.split("-")[1] || "GEN";
      const serialCreate = [];
      for(let s=0; s<qty; s++) {
        const sn = `SN-${prefix}-${serialCounter++}`;
        serials.push(sn);
        serialCreate.push({
          productId: p.id, serial: sn, status: SerialStatus.IN_STOCK, warehouseId: warehouse.id, createdAt: date
        });
      }
      
      const itemCost = Number(p.cost) * qty;
      total += itemCost;

      purchaseItems.push({
        productId: p.id,
        name: p.name,
        qty,
        cost: p.cost,
        extraCost: randomInt(10, 50),
        salePrice: Number(p.cost) * 1.3,
        serials,
        serialNumbers: { create: serialCreate },
        warrantyStartDate: date,
        warrantyMonths: randomItem([12, 24, 36]) // Added 1, 2, or 3 years warranty
      });

      // Update aggregate stock safely via direct update instead of relying on app logic during seed
      await prisma.product.update({ where: { id: p.id }, data: { stock: { increment: qty } }});
      
      // Update warehouse stock
      const whStock = await prisma.warehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: warehouse.id, productId: p.id } }});
      if (whStock) {
        await prisma.warehouseStock.update({ where: { id: whStock.id }, data: { qty: { increment: qty } }});
      } else {
        await prisma.warehouseStock.create({ data: { warehouseId: warehouse.id, productId: p.id, qty }});
      }
    }

    const account = randomItem(accounts);
    await prisma.purchase.create({
      data: {
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        subtotal: total, total: total, paid: total,
        createdAt: date,
        notes: JSON.stringify({
          _m: {
            expectedDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: "Received"
          }
        }),
        items: { create: purchaseItems },
        tenders: { create: { type: TenderType.BANK, accountId: account.id, amount: total }},
        supplierTransactions: {
          create: { supplierId: supplier.id, type: SupplierTxType.PURCHASE, amount: total, balanceBefore: 0, balanceAfter: 0, accountId: account.id, createdAt: date }
        }
      }
    });
  }

  // 6. Sales (Past 5 Months)
  console.log("Generating 80 Sales (Inventory Out)...");
  for (let i = 1; i <= 80; i++) {
    const customer = randomItem(customers);
    const warehouse = randomItem(warehouses);
    const date = randomDateLast5Months();
    const saleItems = [];
    let total = 0;

    const selectedProducts = Array.from({length: randomInt(1, 3)}, () => randomItem(products));
    
    for (const p of selectedProducts) {
      // Find available serials
      const availableSerials = await prisma.serialNumber.findMany({
        where: { productId: p.id, status: SerialStatus.IN_STOCK, warehouseId: warehouse.id },
        take: randomInt(1, 3)
      });

      if (availableSerials.length === 0) continue;

      const qty = availableSerials.length;
      total += Number(p.price) * qty;

      // We will link serials after creating the sale item
      saleItems.push({
        product: p,
        qty,
        serials: availableSerials
      });

      await prisma.product.update({ where: { id: p.id }, data: { stock: { decrement: qty } }});
      const whStock = await prisma.warehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: warehouse.id, productId: p.id } }});
      if (whStock && whStock.qty >= qty) {
        await prisma.warehouseStock.update({ where: { id: whStock.id }, data: { qty: { decrement: qty } }});
      }
    }

    if (saleItems.length === 0) continue;

    const account = randomItem(accounts);
    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id, warehouseId: warehouse.id, userId: user.id,
        channel: SaleChannel.POS, status: SaleStatus.COMPLETED,
        subtotal: total, total: total, paid: total, createdAt: date,
        tenders: { create: { type: TenderType.CASH, accountId: account.id, amount: total }},
        customerTransactions: {
          create: { customerId: customer.id, type: TransactionType.SALE, amount: total, balanceBefore: 0, balanceAfter: 0, accountId: account.id, createdAt: date }
        }
      }
    });

    // Create Sale Items and Link Serials
    for (const item of saleItems) {
      const saleItem = await prisma.saleItem.create({
        data: {
          saleId: sale.id, productId: item.product.id, name: item.product.name,
          qty: item.qty, price: item.product.price, cost: item.product.cost
        }
      });
      // Mark serials as sold
      for (const sn of item.serials) {
        await prisma.serialNumber.update({
          where: { id: sn.id },
          data: { status: SerialStatus.SOLD, saleItemId: saleItem.id, soldAt: date }
        });
      }
    }
  }

  // 7. Inventory Transfers & Adjustments
  console.log("Generating Transfers & Adjustments...");
  const p = randomItem(products);
  if (warehouses.length >= 2) {
    await prisma.transfer.create({
      data: {
        fromWarehouseId: warehouses[0].id, toWarehouseId: warehouses[1].id,
        status: TransferStatus.COMPLETED, createdAt: randomDateLast5Months(), completedAt: randomDateLast5Months(),
        items: { create: { productId: p.id, qty: 2 } }
      }
    });
  }
  await prisma.stockAdjustment.create({
    data: {
      productId: p.id, warehouseId: warehouses[0].id, qtyDelta: -1,
      reason: AdjustmentReason.DAMAGE, notes: "Damaged in transit", createdAt: randomDateLast5Months()
    }
  });

  // 8. Warranty Claims
  console.log("Generating Warranty Claims...");
  const soldSerials = await prisma.serialNumber.findMany({ where: { status: SerialStatus.SOLD }, take: 5, include: { saleItem: true } });
  for (const sn of soldSerials) {
    if(!sn.saleItem) continue;
    const sale = await prisma.sale.findUnique({ where: { id: sn.saleItem.saleId }});
    if(!sale) continue;
    await prisma.warrantyClaim.create({
      data: {
        claimNo: `RMA-${prefix}-${randomInt(100,999)}`,
        type: ClaimType.CUSTOMER_CLAIM,
        status: ClaimStatus.RECEIVED_FROM_CUSTOMER,
        productId: sn.productId,
        serialNumber: sn.serial,
        customerId: sale.customerId,
        saleId: sale.id,
        issueDescription: "Battery draining too fast",
        createdAt: randomDateLast5Months()
      }
    });
  }

  // 9. Finance & Expenses
  console.log("Generating Expenses...");
  for(let i=0; i<10; i++) {
    await prisma.expense.create({
      data: {
        category: randomItem(["Rent", "Utilities", "Marketing", "Salaries"]),
        amount: randomInt(1000, 20000),
        accountId: randomItem(accounts).id,
        date: randomDateLast5Months(),
        notes: "Monthly expense"
      }
    });
  }

  // 10. Reviews & Cash Shifts
  console.log("Generating Reviews & Shifts...");
  for(let i=0; i<10; i++) {
    await prisma.productReview.create({
      data: {
        productId: randomItem(products).id,
        reviewerName: randomItem(customers).name,
        rating: randomInt(3, 5),
        comment: "Great product!",
        approved: true,
        createdAt: randomDateLast5Months()
      }
    });
  }

  await prisma.cashShift.create({
    data: {
      cashierId: user.id, cashierName: user.name || "Admin",
      openingBalance: 5000, closingCount: 15000, expectedCash: 15000,
      status: "Closed", openedAt: randomDateLast5Months(), closedAt: randomDateLast5Months()
    }
  });

  console.log("✅ FINISHED! Successfully populated the entire dashboard across all modules (Home, Parties, Sales, Purchasing, Catalog, Inventory, Warranty, E-Commerce, Finance, Reports, System) with 5 months of history!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
