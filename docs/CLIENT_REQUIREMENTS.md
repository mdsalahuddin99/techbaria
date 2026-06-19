# POS 360 — Client Requirements Document

> **Version:** 1.0  
> **Last Updated:** 2026-06-18  
> **Project:** POS 360 / ShebaTech360  
> **Source:** Client specification + follow-up clarifications (ERP, Storefront, Servicing)  
> **Companion docs:** `docs/technical-architecture-audit.md`, `docs/STOREFRONT.md`, `docs/DATABASE.md`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Principles](#2-core-principles)
3. [Catalog & Product Management](#3-catalog--product-management)
4. [Purchase Management](#4-purchase-management)
5. [Sales & Smart POS](#5-sales--smart-pos)
6. [Operational Control](#6-operational-control)
7. [Storefront E-commerce](#7-storefront-e-commerce)
8. [Servicing Module](#8-servicing-module)
9. [Cross-Cutting Requirements](#9-cross-cutting-requirements)
10. [Implementation Status Matrix](#10-implementation-status-matrix)
11. [Priority Roadmap](#11-priority-roadmap)
12. [Out of Scope (v1)](#12-out-of-scope-v1)

---

## 1. Project Overview

POS 360 is a **multi-module ERP** for electronics and mobile gadget businesses, combining:

| Module | Users | Purpose |
|--------|-------|---------|
| **Admin / ERP** | Owner, Manager, Cashier | Catalog, purchase, inventory, POS, accounts |
| **Storefront** | Public customers | Online catalog, cart, checkout, order tracking |
| **Servicing** | Staff / Technicians | CCTV, mobile repair, maintenance billing |

All modules share:

- **One database** (PostgreSQL + Prisma)
- **One inventory source** — stock, price, availability flow from Purchase → Warehouse → Sale/Storefront
- **One customer/supplier master** — no duplicate records across modules
- **One accounts/ledger system** — all money movement posts to `FinancialAccount`

---

## 2. Core Principles

### 2.1 Backend-first, UI-flexible

Business logic, schema, and API contracts must be **stable and UI-independent**. The UI may change (sidebar ↔ info button ↔ dialog) without altering backend architecture.

```
UI (sidebar / dialog / popover / sheet)
        ↓
API route (apiHandler + Zod)
        ↓
Service layer (src/server/services/*)
        ↓
Prisma schema
```

### 2.2 Catalog vs Inventory vs Storefront

| Layer | What it holds | Who sees it |
|-------|---------------|-------------|
| **Product catalog** | Name, SKU, category, brand, model, specs, description, tracking method | Admin (product form) |
| **Inventory** | Stock qty, cost, warehouse location, serial numbers | Admin (inventory, POS, purchase) |
| **Storefront** | Published products + live stock/price from inventory | Public customers |

> **Client rule:** Product listing (admin) is primarily a **catalog template** — cost, sale price, and serials are often set at **Purchase** time. Storefront displays live data from inventory.

### 2.3 Serial tracking decision at catalog time

When adding a product to the catalog, `trackSerials` is set once:

- `true` → every unit must be scanned/entered (mobile, laptop, CCTV, etc.)
- `false` → quantity-based (cables, accessories, consumables)

This prevents unnecessary serial data and keeps the system clean.

### 2.4 Server-side financial calculation

All totals, wallet splits, due amounts, and ledger entries must be calculated **server-side** inside Prisma `$transaction` blocks — never trusted from the client alone.

---

## 3. Catalog & Product Management

### 3.1 Hierarchical taxonomy

Relational structure with **cascading dropdowns** in the product form:

```
Category
  └── Subcategory
        └── Brand (CategoryBrand)
              └── Product name (SubcategoryProduct)
                    └── Model (SubcategoryModel)
                          └── Series (SubcategorySeries)
```

Each level is linked via foreign keys. Selecting a parent filters the next dropdown.

### 3.2 Product catalog (admin listing)

| Requirement | Detail |
|-------------|--------|
| Purpose | Product **information catalog** — not a live inventory dashboard |
| Display | Name, SKU, category, brand, model, tracking method, publish status |
| Avoid | Heavy stock/price calculation on the catalog list (inventory page handles that) |
| CRUD | Full Create, Read, Update, Delete via dialog forms |

### 3.3 Product form fields

#### Required (existing + to complete)

| Field | Admin form | Storefront | Notes |
|-------|:----------:|:----------:|-------|
| Name, SKU, barcode | ✅ | ✅ | |
| Category hierarchy (FK) | ✅ | Filter | brandId, modelId, seriesId |
| `trackSerials` | ✅ | — | Set once at catalog time |
| `description` (long text) | ❌ **Add** | ✅ | Detail page tab |
| `shortDescription` | ❌ **Add** | ✅ | Card/list preview |
| `isPublished` (Publish to web) | ❌ **Add** | ✅ | Controls storefront visibility |
| Multiple images (`ProductImage`) | ⚠️ Partial | ✅ | Gallery on detail page |
| Specs: color, storage, RAM, condition | ✅ | ✅ | Electronics attributes |
| Warranty months (catalog default) | ✅ | Display | Actual expiry set at sale |

#### Recommended (e-commerce)

| Field | Purpose |
|-------|---------|
| `metaTitle`, `metaDescription` | SEO |
| `highlights` (JSON array or text) | Key selling points |
| `videoUrl` | YouTube embed on detail page |
| `boxContents` | "What's in the box" |
| `featured` / `flashDeal` flags | Homepage sections |

### 3.4 Acceptance criteria

- [ ] Admin can create a product with full hierarchy without entering stock/price
- [ ] `trackSerials` toggle controls purchase and POS behaviour
- [ ] Description and publish toggle available in product form
- [ ] Only `isPublished: true` products appear on storefront

---

## 4. Purchase Management

### 4.1 Purchase flow

| Step | Requirement |
|------|-------------|
| 1 | Select **Supplier** |
| 2 | Select **Branch** and **Warehouse** (stock destination) |
| 3 | Add one or more products (multi-line PO) |
| 4 | Per line: cost price, extra cost, sale margin/price, warranty months, expected date |
| 5 | Serial products: auto-open scanner / manual serial entry (qty = serial count) |
| 6 | Non-serial products: manual quantity entry |
| 7 | Multi-payment: Cash, Bank, Mobile Banking → linked to `FinancialAccount` |
| 8 | Generate printable purchase invoice |

### 4.2 Supplier profile panel (NEW — client requirement)

Mirror the **POS Customer Sidebar** pattern for purchases.

When a supplier is selected, staff must see:

| Data | Source |
|------|--------|
| Contact profile | `Supplier` (name, phone, email, address, contactPerson) |
| Payable balance | `Supplier.payable` |
| Recent purchase orders | `Purchase` where `supplierId` |
| Recent payments | `SupplierPayment` |
| Notes | `Supplier.notes` |

#### UI options (either is acceptable — backend must support both)

| Option | Description |
|--------|-------------|
| **A. Left sidebar** | Full panel beside purchase form (matches POS layout) |
| **B. Info (ℹ️) button** | Button next to supplier field → Sheet/Popover with full profile |
| **C. Hybrid** | Sidebar on desktop, info sheet on mobile |

> **Architecture rule:** One `supplierProfileService.get(ctx, supplierId)` API — UI chooses presentation.

#### Required APIs (to build)

```
GET /api/suppliers/:id/profile     → aggregated supplier summary
GET /api/purchases/by-supplier     → ?supplierId= → recent PO list
```

### 4.3 Acceptance criteria

- [ ] Purchase creates stock in selected warehouse
- [ ] Serial products require serial scan; qty matches serial count
- [ ] Multi-tender payment posts to correct accounts
- [ ] Supplier profile/history visible when supplier selected (sidebar or ℹ️ button)
- [ ] Purchase invoice printable

---

## 5. Sales & Smart POS

### 5.1 Layout

| Area | Content |
|------|---------|
| **Left — Customer panel** | Customer select, profile, phone/email, wallet balance, due balance, recent invoices |
| **Center — Invoice** | Product search/filter, line items, serials under each product |
| **Right — Payment** | Discount, multi-tender payment collector |

Route: `/dashboard/sales/create` (legacy `/pos` redirects here).

### 5.2 Customer panel (reference implementation)

When customer is selected:

- Show **wallet/advance balance** and **outstanding due**
- Show **previous invoices** (invoice no, date, paid/due status)
- Link to full history (optional expand)

API: `GET /api/sales/by-customer?customerId=`

### 5.3 Product search & serial handling

| Requirement | Detail |
|-------------|--------|
| Category filter | Filter products by category/subcategory |
| Search | By name, SKU, barcode |
| Serial products | Barcode/scanner input; serial list shown under line item |
| Stock check | Validate against warehouse/serial IN_STOCK count |

### 5.4 Payment & wallet logic (smart POS)

Priority order when customer has wallet balance:

```
1. Apply customer wallet/advance first (Wallet tender)
2. Remaining amount → Cash / Bank / Mobile Banking
3. If still short → auto record as Due (customer credit)
```

| Rule | Detail |
|------|--------|
| Wallet priority | **Auto-apply** wallet before other tenders (currently manual — **to implement**) |
| Multi-tender | Cash + Bank + Mobile + Wallet in one invoice |
| Due | Server calculates `due = total - paid`; posts to `Customer.due` + ledger |
| Server-side | All calculations in `sales/create.ts` + `salesAccounting.ts` |

### 5.5 Acceptance criteria

- [ ] Customer sidebar shows profile, wallet, due, recent invoices
- [ ] Wallet auto-applied on checkout when customer has balance
- [ ] Serial scan adds correct unit to invoice
- [ ] Due recorded automatically when payment is insufficient
- [ ] Sale decrements inventory and posts to accounts

---

## 6. Operational Control

### 6.1 CRUD via dialog forms

Full Create, Read, Update, Delete for:

- Customers
- Products (catalog)
- Purchases
- Suppliers
- Categories
- Expenses
- Accounts

### 6.2 Warranty & serial lifecycle

| Event | Serial status | Warranty |
|-------|---------------|----------|
| Purchase (serial scanned) | `IN_STOCK` | Start date from purchase line |
| POS / Storefront sale | `SOLD` | `warrantyExpiryDate` calculated |
| Void / refund (restock) | `IN_STOCK` | Expiry cleared |
| Service (future) | Link to sold serial | Check if under warranty |

Serial numbers link: **Supplier → Purchase → Stock → Customer (Sale)** — full traceability.

### 6.3 Acceptance criteria

- [ ] All master data manageable via dialog CRUD
- [ ] Serial lifecycle tracked end-to-end
- [ ] Warranty expiry set on sale, cleared on void

---

## 7. Storefront E-commerce

### 7.1 Overview

Public-facing website for **electronics and mobile gadgets**. Stock, price, and availability come **directly from ERP inventory** — no separate storefront stock.

### 7.2 Required pages & features

| Feature | Path | Status |
|---------|------|--------|
| Home | `/storefront` | ✅ Exists |
| Shop / catalog | `/storefront/shop` | ✅ Exists |
| Nested category URLs | `/storefront/shop/{category}/...` | ⚠️ Flat only |
| Product detail | `/storefront/p/[slug]` | ✅ Exists |
| Search | Smart search header | ✅ Exists |
| Cart | `/storefront/cart` | ✅ Exists |
| Checkout | `/storefront/checkout` | ✅ Exists (API blocked — fix needed) |
| Order tracking | `/storefront/track` | ✅ Exists |
| Wishlist | `/storefront/wishlist` | ✅ Exists |
| Compare | `/storefront/compare` | ✅ Exists |
| Account / login | `/storefront/account` | ✅ Exists |

### 7.3 Navigation — hierarchical menu (electronics standard)

Customer must browse like a typical gadget e-commerce site:

```
Category (e.g. Mobile)
  └── Subcategory (e.g. Smartphone)
        └── Brand (e.g. Samsung)
              └── Products / Models
```

Requirements:

- **Mega menu** or sidebar with nested categories
- **Brand pages** and brand filter
- URL structure: `/shop/mobile/smartphone/samsung` (nested slugs)
- Filters: category, brand, price range, in-stock, on-sale
- Real-time **stock badge** on product cards ("In Stock" / "Out of Stock")

### 7.4 Product detail page (electronics)

| Section | Content |
|---------|---------|
| Gallery | Multiple images, zoom |
| Variants | Color, storage (from product fields) |
| Price | Live from inventory |
| Stock status | From `Product.stock` / serial count |
| Tabs | Description, Specifications, Shipping, Returns |
| Specs table | RAM, storage, display, battery, camera, etc. |
| Add to cart / Buy now | |
| Wishlist / Compare | |

### 7.5 Inventory sync rules

```
Purchase (stock IN)  ──→  Product.stock ↑  ──→  Storefront shows available
POS Sale             ──→  Product.stock ↓  ──→  Storefront updates
Storefront checkout  ──→  Product.stock ↓  ──→  Same transaction as sale
```

- Storefront only shows `isPublished: true` products
- Out-of-stock products: hide or show "Out of Stock" (configurable)
- Serial-tracked products: available qty = IN_STOCK serial count

### 7.6 Public API requirements

Storefront must use **public APIs** (no admin session required):

```
GET  /api/storefront/products           → published product list
GET  /api/storefront/products/:slug     → product detail
POST /api/storefront/checkout           → create order (channel=STOREFRONT)
GET  /api/storefront/orders/:id         → order status (guest)
GET  /api/storefront/catalog-tree       → nested menu (to build)
```

> **Blocker:** `middleware.ts` currently requires auth for all `/api/*` except `/api/auth/`. Must whitelist `/api/storefront/*`.

### 7.7 Checkout rules

- COD, bKash, Nagad, Card payment methods (recorded on order; COD = due = total)
- Shipping: inside Dhaka / outside Dhaka / pickup
- Order saved to `Sale` table with `channel: "STOREFRONT"`
- **No localStorage-only fake orders in production** — API failure must show error to user

### 7.8 Acceptance criteria

- [ ] Anonymous user can browse, search, filter, add to cart, checkout
- [ ] Hierarchical category/brand navigation
- [ ] Stock and price reflect live inventory
- [ ] Product description and specs visible on detail page
- [ ] Admin sees storefront orders alongside POS sales

---

## 8. Servicing Module

### 8.1 Overview

Separate business line for **service work** — not product sales:

- CCTV installation & maintenance
- Mobile / laptop repair
- AMC (annual maintenance contracts)
- General tech servicing

### 8.2 Client intent

> "Sales invoice তৈরি করার মতোই — customer আনলেই চলবে, service fields থাকবে, account-এ direct post হবে।"

### 8.3 Core flow

```
/dashboard/services/create
  1. Select customer (reuse CustomerSidebar)
  2. Select service type
  3. Enter device info (optional: scan serial → warranty lookup)
  4. Add service line items (labor, parts, visit charge)
  5. Payment: Wallet → Cash/Bank/Mobile → Due (same as POS)
  6. Save → post to accounts ledger
  7. Print service receipt / invoice
```

### 8.4 Service-specific fields

| Field | Required | Notes |
|-------|:--------:|-------|
| `customerId` | ✅ | Reuse existing Customer |
| `serviceType` | ✅ | CCTV_INSTALL, MOBILE_REPAIR, AMC, OTHER |
| `status` | ✅ | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| `deviceDescription` | ✅ | Free text or structured |
| `serialNumberId` | Optional | Link to sold unit for warranty check |
| `complaintDescription` | ✅ | Customer reported issue |
| `diagnosisNotes` | Optional | Technician findings |
| `laborAmount` | ✅ | Main service charge |
| `partsAmount` | Optional | Spare parts (may consume inventory) |
| `discount` | Optional | |
| `assignedTechnicianId` | Optional | Staff user |
| `scheduledDate` | Optional | Appointment |
| `warrantyCovered` | Optional | Service free under warranty? |
| `completedAt` | Auto | Set on completion |

### 8.5 Account integration

Same pattern as POS sale:

| Tender | Account effect |
|--------|----------------|
| Cash / Bank / Mobile | `FinancialAccount.balance` += amount |
| Wallet | `Customer.balance` -= amount |
| Due | `Customer.due` += amount |
| Parts (if stocked) | Optional inventory decrement |

### 8.6 Architecture recommendation

**Phase 1 (fast):** Extend `Sale` with `channel: "SERVICE"` + service metadata in `Sale.data` JSON.

**Phase 2 (clean):** Dedicated `ServiceOrder` + `ServiceTender` models when AMC, technician assignment, and parts tracking mature.

```
Phase 1                          Phase 2
────────                         ────────
Sale (channel=SERVICE)    →      ServiceOrder table
SaleItem (service lines)  →      ServiceLineItem
salesAccounting reuse     →      serviceAccounting.ts
CustomerSidebar reuse     →      same
```

### 8.7 Servicing dashboard (future)

| Page | Purpose |
|------|---------|
| `/dashboard/services` | Service order list |
| `/dashboard/services/create` | New service invoice |
| `/dashboard/services/[id]` | Detail + status update |
| `/dashboard/warranty-lookup` | Serial → warranty status (exists, enhance) |

### 8.8 Acceptance criteria

- [ ] Create service invoice with customer + service type + amount
- [ ] Payment posts to financial accounts
- [ ] Optional serial link shows warranty status
- [ ] Printable service receipt
- [ ] Service orders visible in reports (separate from product sales)

---

## 9. Cross-Cutting Requirements

### 9.1 Inventory

- Stock lives at **Product** (aggregate) + **WarehouseStock** (per warehouse) + **SerialNumber** (per unit)
- Transfers between branches/warehouses supported
- Low-stock alerts
- Stock adjustments with reason codes

### 9.2 Accounts & ledger

- Financial accounts: Cash, Bank, Mobile Banking (bKash, Nagad, etc.)
- All sales, purchases, expenses, transfers post to accounts
- Customer wallet and due tracked via `CustomerTransaction`
- Supplier payable tracked on `Supplier.payable`

### 9.3 Roles

| Role | Access |
|------|--------|
| OWNER | Full access |
| MANAGER | Operations + void/refund + settings (no user mgmt) |
| CASHIER | POS sales, view data |
| VIEWER | Read-only |
| CUSTOMER (future) | Storefront account only — **not CASHIER** |

### 9.4 Multi-tenant

- All data scoped by `shopId`
- Current deployment: single shop via `DEFAULT_SHOP_ID`
- Future: subdomain-based shop resolution for SaaS

### 9.5 Security (non-functional)

- [ ] Public storefront APIs accessible without admin session
- [ ] Destructive operations (wipe, void) require appropriate role
- [ ] Storefront customer registration must not grant POS access
- [ ] Server-side validation on all financial operations

---

## 10. Implementation Status Matrix

| Requirement | Status | Notes |
|-------------|--------|-------|
| Catalog hierarchy (FK) | ✅ Done | brandId, modelId, seriesId |
| Product catalog CRUD | ✅ Done | Dialog form |
| `trackSerials` at catalog | ✅ Done | |
| Product description in form | ❌ Missing | DB field exists |
| `isPublished` toggle in form | ❌ Missing | DB field exists |
| Purchase multi-line + serial | ✅ Done | |
| Purchase invoice print | ✅ Done | |
| Supplier profile panel | ❌ Missing | API + UI needed |
| POS customer sidebar | ✅ Done | CustomerSidebar |
| POS wallet auto-priority | ❌ Missing | Manual wallet tender only |
| POS serial scan | ✅ Done | |
| Auto due on short payment | ✅ Server-side | |
| Warranty serial lifecycle | ✅ Done | |
| Storefront pages (cart, checkout, etc.) | ✅ UI exists | |
| Storefront public API wired | ❌ Blocked | Middleware + wrong hooks |
| Storefront hierarchical menu | ❌ Missing | Flat categories only |
| Servicing module | ❌ Not started | Phase 1 design ready |
| Storefront ↔ inventory sync | ✅ Logic exists | Wire-up incomplete |

**Legend:** ✅ Done · ⚠️ Partial · ❌ Not started / blocked

---

## 11. Priority Roadmap

### P0 — Security & storefront unblock

1. Middleware whitelist `/api/storefront/*`
2. Storefront hooks → public API (`/api/storefront/products`)
3. Fix backup/wipe RBAC
4. Fix storefront registration role (CUSTOMER/VIEWER, not CASHIER)
5. Remove localStorage checkout fallback in production

### P1 — Client ERP gaps

6. Product form: description + isPublished + image gallery
7. POS wallet auto-apply on checkout
8. Supplier profile API + ℹ️ info panel in purchase form
9. Admin product list → catalog-focused view (optional stock/price columns)

### P2 — Storefront electronics UX

10. Catalog tree API for nested navigation
11. Mega menu: Category → Subcategory → Brand
12. Nested shop URLs
13. SEO fields (meta title, description)
14. Spec table from structured product fields

### P3 — Servicing module

15. Service invoice (Phase 1: Sale channel=SERVICE)
16. Service dashboard pages
17. Serial/warranty link on service create
18. Phase 2: dedicated ServiceOrder schema (if needed)

---

## 12. Out of Scope (v1)

- External payment gateway integration (SSLCommerz, Stripe) — COD + manual record only
- Multi-shop SaaS subdomain routing — single shop first
- Native mobile app
- Automated SMS/email notifications (infrastructure exists, templates TBD)
- Full AMC contract management (Phase 3 servicing)

---

## Appendix A — Entity Relationship (Business View)

```
Shop
 ├── Category → Brand → Model → Series
 ├── Product (catalog template)
 │     └── SerialNumber (inventory units)
 ├── Supplier ──→ Purchase ──→ WarehouseStock
 ├── Customer ──→ Sale (POS / STOREFONT / SERVICE)
 │     └── CustomerTransaction (wallet, due)
 ├── FinancialAccount ←── tenders (sale, purchase, expense, service)
 └── User (staff roles)
```

## Appendix B — Related Documents

| Document | Purpose |
|----------|---------|
| `docs/technical-architecture-audit.md` | Technical audit, security findings, maturity scores |
| `docs/STOREFRONT.md` | Storefront routes, data flow, cart |
| `docs/DATABASE.md` | Schema reference |
| `docs/DEPLOYMENT.md` | Production deployment |
| `docs/LOCAL_SETUP.md` | Local dev setup |

---

*This document is the single source of truth for client-facing requirements. Update this file when scope changes; link technical details to the architecture audit.*
