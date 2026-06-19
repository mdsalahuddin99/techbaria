# Database Schema (Prisma)

Postgres schema for ShebaTech 360. Lives in `prisma/schema.prisma`.

---

## 1. Setup

```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

`.env.local`:

```env
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"   # pooled (app queries)
DIRECT_URL="postgresql://..."                                        # direct (migrations)
```

Neon gives both. For self-hosted Postgres set `DATABASE_URL = DIRECT_URL` (same string).

---

## 2. Multi-tenancy

Every business table has `shopId String` + `@@index([shopId])`. Service layer enforces `where: { shopId: ctx.shopId }` on every query. No Postgres RLS — tenant isolation happens in the service layer (simpler, portable).

---

## 3. Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============ AUTH (Auth.js v5 standard) ============

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  passwordHash  String?               // null for OAuth-only users
  role          Role      @default(CASHIER)
  shopId        String
  shop          Shop      @relation(fields: [shopId], references: [id])
  accounts      Account[]
  sessions      Session[]
  sales         Sale[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {                       // OAuth providers
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

enum Role {
  OWNER
  MANAGER
  CASHIER
  VIEWER
}

// ============ TENANCY ============

model Shop {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logoUrl   String?
  currency  String   @default("BDT")
  timezone  String   @default("Asia/Dhaka")
  settings  Json     @default("{}")
  users     User[]
  branches  Branch[]
  products  Product[]
  customers Customer[]
  suppliers Supplier[]
  sales     Sale[]
  purchases Purchase[]
  accounts  FinancialAccount[]
  expenses  Expense[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Branch {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name      String
  address   String?
  isMain    Boolean  @default(false)
  sales     Sale[]
  stocks    BranchStock[]
  createdAt DateTime @default(now())
  @@index([shopId])
}

// ============ CATALOG ============

model Category {
  id        String    @id @default(cuid())
  shopId    String
  name      String
  slug      String
  parentId  String?
  parent    Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  products  Product[]
  @@unique([shopId, slug])
  @@index([shopId])
}

model Product {
  id          String        @id @default(cuid())
  shopId      String
  shop        Shop          @relation(fields: [shopId], references: [id], onDelete: Cascade)
  sku         String
  barcode     String?
  name        String
  slug        String
  description String?       @db.Text
  categoryId  String?
  category    Category?     @relation(fields: [categoryId], references: [id])
  price       Decimal       @db.Decimal(12, 2)
  cost        Decimal       @db.Decimal(12, 2) @default(0)
  stock       Int           @default(0)         // aggregate; per-branch in BranchStock
  reorderLevel Int          @default(0)
  unit        String        @default("pc")
  images      ProductImage[]
  variants    ProductVariant[]
  isPublished Boolean       @default(false)     // visible on storefront
  saleItems   SaleItem[]
  purchaseItems PurchaseItem[]
  branchStocks BranchStock[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@unique([shopId, sku])
  @@unique([shopId, slug])
  @@index([shopId, isPublished])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String                                  // Cloudinary URL
  publicId  String                                  // Cloudinary public_id
  position  Int     @default(0)
  alt       String?
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  name      String                                  // "Red / XL"
  sku       String
  price     Decimal @db.Decimal(12, 2)
  stock     Int     @default(0)
  attrs     Json    @default("{}")
}

model BranchStock {
  id        String  @id @default(cuid())
  branchId  String
  branch    Branch  @relation(fields: [branchId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  qty       Int     @default(0)
  @@unique([branchId, productId])
}

// ============ PARTNERS ============

model Customer {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name      String
  phone     String?
  email     String?
  address   String?
  due       Decimal  @db.Decimal(12, 2) @default(0)
  notes     String?
  sales     Sale[]
  createdAt DateTime @default(now())
  @@index([shopId, phone])
}

model Supplier {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name      String
  phone     String?
  email     String?
  payable   Decimal  @db.Decimal(12, 2) @default(0)
  purchases Purchase[]
  payments  SupplierPayment[]
  createdAt DateTime @default(now())
  @@index([shopId])
}

// ============ SALES ============

enum SaleChannel { POS STOREFRONT }
enum SaleStatus  { COMPLETED HELD VOIDED REFUNDED }

model Sale {
  id          String       @id @default(cuid())
  shopId      String
  shop        Shop         @relation(fields: [shopId], references: [id], onDelete: Cascade)
  branchId    String?
  branch      Branch?      @relation(fields: [branchId], references: [id])
  userId      String?
  user        User?        @relation(fields: [userId], references: [id])
  customerId  String?
  customer    Customer?    @relation(fields: [customerId], references: [id])
  channel     SaleChannel  @default(POS)
  status      SaleStatus   @default(COMPLETED)
  subtotal    Decimal      @db.Decimal(12, 2)
  discount    Decimal      @db.Decimal(12, 2) @default(0)
  total       Decimal      @db.Decimal(12, 2)
  paid        Decimal      @db.Decimal(12, 2) @default(0)
  due         Decimal      @db.Decimal(12, 2) @default(0)
  notes       String?
  items       SaleItem[]
  tenders     SaleTender[]
  data        Json         @default("{}")        // misc: shipping addr, tracking, etc.
  createdAt   DateTime     @default(now())
  @@index([shopId, channel, createdAt])
  @@index([shopId, customerId])
}

model SaleItem {
  id        String  @id @default(cuid())
  saleId    String
  sale      Sale    @relation(fields: [saleId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  name      String                              // snapshot
  qty       Int
  price     Decimal @db.Decimal(12, 2)          // snapshot
  cost      Decimal @db.Decimal(12, 2)          // snapshot for COGS
  discount  Decimal @db.Decimal(12, 2) @default(0)
}

enum TenderType { CASH BANK BKASH NAGAD ROCKET CARD DUE OTHER }

model SaleTender {
  id        String     @id @default(cuid())
  saleId    String
  sale      Sale       @relation(fields: [saleId], references: [id], onDelete: Cascade)
  type      TenderType
  accountId String?
  account   FinancialAccount? @relation(fields: [accountId], references: [id])
  amount    Decimal    @db.Decimal(12, 2)
  ref       String?                                // txn id / cheque no
}

// ============ PURCHASES ============

model Purchase {
  id         String         @id @default(cuid())
  shopId     String
  shop       Shop           @relation(fields: [shopId], references: [id], onDelete: Cascade)
  supplierId String?
  supplier   Supplier?      @relation(fields: [supplierId], references: [id])
  invoiceNo  String?
  subtotal   Decimal        @db.Decimal(12, 2)
  discount   Decimal        @db.Decimal(12, 2) @default(0)
  total      Decimal        @db.Decimal(12, 2)
  paid       Decimal        @db.Decimal(12, 2) @default(0)
  due        Decimal        @db.Decimal(12, 2) @default(0)
  items      PurchaseItem[]
  tenders    PurchaseTender[]
  notes      String?
  createdAt  DateTime       @default(now())
  @@index([shopId, createdAt])
}

model PurchaseItem {
  id         String   @id @default(cuid())
  purchaseId String
  purchase   Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  qty        Int
  cost       Decimal  @db.Decimal(12, 2)
}

model PurchaseTender {
  id         String     @id @default(cuid())
  purchaseId String
  purchase   Purchase   @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  type       TenderType
  accountId  String?
  account    FinancialAccount? @relation(fields: [accountId], references: [id])
  amount     Decimal    @db.Decimal(12, 2)
  ref        String?
}

model SupplierPayment {
  id         String   @id @default(cuid())
  supplierId String
  supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  amount     Decimal  @db.Decimal(12, 2)
  accountId  String?
  account    FinancialAccount? @relation(fields: [accountId], references: [id])
  date       DateTime @default(now())
  notes      String?
}

// ============ FINANCE ============

enum AccountType { CASH BANK MOBILE_BANKING WALLET OTHER }

model FinancialAccount {
  id           String      @id @default(cuid())
  shopId       String
  shop         Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name         String
  type         AccountType
  parentId     String?
  parent       FinancialAccount?  @relation("AccountTree", fields: [parentId], references: [id])
  children     FinancialAccount[] @relation("AccountTree")
  openingBalance Decimal   @db.Decimal(14, 2) @default(0)
  balance      Decimal     @db.Decimal(14, 2) @default(0)
  saleTenders     SaleTender[]
  purchaseTenders PurchaseTender[]
  supplierPayments SupplierPayment[]
  transfersIn  AccountTransfer[] @relation("ToAccount")
  transfersOut AccountTransfer[] @relation("FromAccount")
  expenses     Expense[]
  archived     Boolean     @default(false)
  createdAt    DateTime    @default(now())
  @@index([shopId, type])
}

model AccountTransfer {
  id           String   @id @default(cuid())
  shopId       String
  fromAccountId String
  fromAccount  FinancialAccount @relation("FromAccount", fields: [fromAccountId], references: [id])
  toAccountId  String
  toAccount    FinancialAccount @relation("ToAccount", fields: [toAccountId], references: [id])
  amount       Decimal  @db.Decimal(14, 2)
  notes        String?
  date         DateTime @default(now())
}

model Expense {
  id         String   @id @default(cuid())
  shopId     String
  shop       Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  category   String
  amount     Decimal  @db.Decimal(12, 2)
  accountId  String?
  account    FinancialAccount? @relation(fields: [accountId], references: [id])
  date       DateTime @default(now())
  notes      String?
  @@index([shopId, date])
}

// ============ INVENTORY ============

enum AdjustmentReason { DAMAGE LOSS THEFT CORRECTION RECEIVED OTHER }

model StockAdjustment {
  id        String           @id @default(cuid())
  shopId    String
  productId String
  branchId  String?
  qtyDelta  Int                                  // +/-
  reason    AdjustmentReason
  notes     String?
  userId    String?
  createdAt DateTime         @default(now())
  @@index([shopId, productId])
}

model Transfer {
  id           String         @id @default(cuid())
  shopId       String
  fromBranchId String
  toBranchId   String
  status       TransferStatus @default(PENDING)
  items        TransferItem[]
  notes        String?
  createdAt    DateTime       @default(now())
  completedAt  DateTime?
  @@index([shopId])
}

enum TransferStatus { PENDING IN_TRANSIT COMPLETED CANCELLED }

model TransferItem {
  id         String   @id @default(cuid())
  transferId String
  transfer   Transfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  productId  String
  qty        Int
}

// ============ AUDIT ============

model AuditLog {
  id        String   @id @default(cuid())
  shopId    String
  userId    String?
  entity    String                                // "Product", "Sale", etc.
  entityId  String
  action    String                                // "CREATE" | "UPDATE" | "DELETE"
  diff      Json?
  createdAt DateTime @default(now())
  @@index([shopId, entity, entityId])
  @@index([shopId, createdAt])
}
```

---

## 4. Seed Script

`prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.create({
    data: { name: "Demo Shop", slug: "demo", currency: "BDT" },
  });
  await prisma.user.create({
    data: {
      email: "owner@demo.com",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "OWNER",
      shopId: shop.id,
    },
  });
  // ...port categories, products, customers, suppliers from src/shared/lib/mock.ts
}

main().finally(() => prisma.$disconnect());
```

Add to `package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```
