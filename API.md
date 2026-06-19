# POS 360 — API Documentation

> **Version:** 0.0.1  
> **Base URL:** `http://localhost:3000` (dev) / `https://yourdomain.com` (production)  
> **Auth:** Auth.js v5 (JWT) — Bearer token in cookie, or credentials via signIn  
> **Schema:** Zod (validates request body)  
> **Error Format:** `{ error: string, message?: string, issues?: ZodIssue[] }`

---

## 📋 Table of Contents

1. [Authentication & Users](#-authentication--users)
2. [Products](#-products)
3. [Categories](#-categories)
4. [Purchases (Stock In)](#-purchases-stock-in)
5. [Sales (POS)](#-sales-pos)
6. [Returns & Refunds](#-returns--refunds)
7. [Customers](#-customers)
8. [Suppliers](#-suppliers)
9. [Inventory & Stock](#-inventory--stock)
10. [Stock Transfers](#-stock-transfers)
11. [Financial Accounts](#-financial-accounts)
12. [Expenses](#-expenses)
13. [Cash Shifts](#-cash-shifts)
14. [Notifications](#-notifications)
15. [Branches](#-branches)
16. [Audit Logs](#-audit-logs)
17. [Storefront (Public)](#-storefront-public)
18. [Uploads](#-uploads)
19. [Error Codes](#-error-codes)

---

## 🔐 Authentication & Users

### `POST /api/auth/register`

Create a new shop + owner account.

**Request Body:**

| Field      | Type   | Required | Description               |
|------------|--------|----------|---------------------------|
| `name`     | string | ✅       | Owner full name (2-100 chars) |
| `email`    | string | ✅       | Email address (max 255)   |
| `password` | string | ✅       | Min 8 characters          |
| `shopName` | string | ❌       | Shop name (max 120 chars) |

**Response `201`:**

```json
{
  "user": { "id": "...", "name": "...", "email": "..." },
  "shop": { "id": "...", "name": "..." }
}
```

**Error `422`:**

```json
{
  "error": "VALIDATION",
  "issues": [{ "field": "email", "message": "Invalid email address" }]
}
```

---

### `POST /api/auth/reset-password`

Request a password reset OTP.

**Request Body:**

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `email` | string | ✅       | User email  |

---

### `POST /api/auth/otp`

Verify OTP and reset password.

**Request Body:**

| Field         | Type   | Required | Description     |
|---------------|--------|----------|-----------------|
| `email`       | string | ✅       | User email      |
| `otp`         | string | ✅       | OTP code        |
| `newPassword` | string | ✅       | New password    |

---

### `GET /api/auth/profile`

Get current user profile.

**Response `200`:**

```json
{
  "id": "...",
  "name": "Owner Name",
  "email": "owner@demo.com",
  "role": "OWNER",
  "shopId": "...",
  "shopName": "Demo Shop"
}
```

---

### `GET /api/auth/session`

Get current session (Auth.js built-in). Returns `null` if not authenticated.

**Response `200` (authenticated):**

```json
{
  "user": {
    "id": "...",
    "name": "Owner",
    "email": "owner@demo.com",
    "role": "OWNER",
    "image": null
  },
  "expires": "2025-..."
}
```

---

## 📦 Products

### `GET /api/products`

List products for the current shop. Requires authentication.

**Query Parameters:**

| Param         | Type    | Required | Description                                      |
|---------------|---------|----------|--------------------------------------------------|
| `search`      | string  | ❌       | Filter by name / SKU / barcode (case-insensitive) |
| `categoryId`  | string  | ❌       | Filter by category ID                             |
| `isPublished` | boolean | ❌       | Filter by published status                        |
| `lowStock`    | boolean | ❌       | Filter products below reorder level               |

**Response `200`:**

```json
[
  {
    "id": "cmq...",
    "sku": "SKU-001",
    "barcode": "2004941506513",
    "name": "Product Name",
    "slug": "product-name",
    "description": "Description",
    "category": "Category Name",
    "categoryId": "cmq...",
    "price": 99.99,
    "cost": 50.00,
    "stock": 100,
    "reorderLevel": 10,
    "unit": "pcs",
    "isPublished": true,
    "active": true,
    "images": [{ "id": "...", "url": "...", "position": 1 }],
    "createdAt": "2025-..."
  }
]
```

**Note:** `active` is an alias for `isPublished` — mapped by the server serialiser.

---

### `POST /api/products`

Create a new product. Requires `MANAGER`+ role.

**Request Body:**

| Field         | Type    | Required | Default   |
|---------------|---------|----------|-----------|
| `name`        | string  | ✅       | —         |
| `sku`         | string  | ✅       | —         |
| `barcode`     | string  | ❌       | —         |
| `slug`        | string  | ❌       | Auto from name |
| `description` | string  | ❌       | —         |
| `categoryId`  | string  | ❌       | —         |
| `price`       | number  | ✅       | —         |
| `cost`        | number  | ❌       | 0         |
| `stock`       | number  | ❌       | 0         |
| `reorderLevel`| number  | ❌       | 0         |
| `unit`        | string  | ❌       | "pc"      |
| `isPublished` | boolean | ❌       | false     |

---

### `GET /api/products/[id]`

Get single product by ID.

**Response `200`:** Same shape as list item.  
**Error `404`:** `{ "error": "NOT_FOUND" }`

---

### `PATCH /api/products/[id]`

Update a product. Requires `MANAGER`+ role.

**Request Body:** Partial product fields (same schema as create, all optional).

---

### `DELETE /api/products/[id]`

Delete a product. Requires `MANAGER`+ role.

**Response `200`:** `{ "success": true }`

---

## 🏷️ Categories

### `GET /api/categories`

List categories. Defaults to tree structure. Use `?flat=true` for flat list.

**Query Parameters:**

| Param  | Type    | Required | Description                          |
|--------|---------|----------|--------------------------------------|
| `flat` | boolean | ❌       | Return flat list instead of tree     |

**Response `200` (tree — default):**

```json
[
  {
    "id": "cmq...",
    "name": "Electronics",
    "slug": "electronics",
    "parentId": null,
    "productCount": 15,
    "children": [
      {
        "id": "cmq...",
        "name": "Mobiles",
        "slug": "mobiles",
        "parentId": "cmq...",
        "productCount": 5,
        "children": []
      }
    ],
    "createdAt": "2025-..."
  }
]
```

---

### `POST /api/categories`

Create a category. Requires `MANAGER`+ role.

**Request Body:**

| Field      | Type   | Required | Description              |
|------------|--------|----------|--------------------------|
| `name`     | string | ✅       | Category name            |
| `slug`     | string | ❌       | Auto from name           |
| `parentId` | string | ❌       | Parent category ID       |

---

### `PATCH /api/categories/[id]`

Update a category. Requires `MANAGER`+ role.

---

### `DELETE /api/categories/[id]`

Delete a category. Requires `MANAGER`+ role.  
**Error `409`:** `{ "error": "CONFLICT" }` — if category has products.

---

## 📥 Purchases (Stock In)

### `GET /api/purchases`

List purchase orders.

**Response `200`:**

```json
[
  {
    "id": "cmq...",
    "invoiceNo": "PO-001",
    "supplierId": "cmq...",
    "subtotal": 5000.00,
    "discount": 100.00,
    "total": 4900.00,
    "paid": 4900.00,
    "due": 0.00,
    "notes": "Payment done",
    "supplier": { "id": "...", "name": "ABC Supplier" },
    "items": [
      {
        "id": "...",
        "productId": "...",
        "product": { "id": "...", "name": "Product", "sku": "SKU-001" },
        "qty": 10,
        "cost": 500.00,
        "subtotal": 5000.00,
        "receivedQty": 10
      }
    ],
    "createdAt": "2025-..."
  }
]
```

---

### `POST /api/purchases`

Create a purchase order (stock in). Requires `MANAGER`+ role.

**Request Body:**

| Field        | Type     | Required | Description                |
|--------------|----------|----------|----------------------------|
| `supplierId` | string   | ✅       | Supplier ID                |
| `invoiceNo`  | string   | ❌       | Auto-generated if omitted  |
| `items`      | array    | ✅       | Array of purchase items    |
| `discount`   | number   | ❌       | 0                          |
| `paid`       | number   | ❌       | 0 (creates due if < total) |
| `notes`      | string   | ❌       | —                          |

**Item shape:**

| Field       | Type   | Required |
|-------------|--------|----------|
| `productId` | string | ✅       |
| `qty`       | number | ✅       |
| `cost`      | number | ✅       |
| `receivedQty` | number | ❌ (default = qty) |

---

### `GET /api/purchases/[id]`

Get single purchase with items.

---

### `PATCH /api/purchases/[id]`

Update a purchase. Updates stock quantities if receivedQty changes.

---

## 💰 Sales (POS)

### `GET /api/sales`

List sales. Supports filtering.

**Query Parameters:**

| Param        | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `channel`    | string | ❌       | Filter: `POS` or `STOREFRONT`       |
| `customerId` | string | ❌       | Filter by customer                   |
| `from`       | date   | ❌       | Start date (ISO)                     |
| `to`         | date   | ❌       | End date (ISO)                       |

---

### `POST /api/sales`

Create a sale (checkout). Requires `CASHIER`+ role.

**Request Body:**

| Field        | Type    | Required | Description               |
|--------------|---------|----------|---------------------------|
| `items`      | array   | ✅       | Sale items with qty/price |
| `tenders`    | array   | ✅       | Payment methods           |
| `customerId` | string  | ❌       | Walk-in if omitted        |
| `discount`   | number  | ❌       | 0                         |
| `notes`      | string  | ❌       | —                         |

**Item shape:**

| Field       | Type   | Required |
|-------------|--------|----------|
| `productId` | string | ✅       |
| `qty`       | number | ✅       |
| `price`     | number | ✅       |

**Tender shape:**

| Field       | Type   | Required | Description                |
|-------------|--------|----------|----------------------------|
| `type`      | string | ✅       | `CASH`, `CARD`, `BKASH`, `NAGAD`, etc. |
| `amount`    | number | ✅       | Tendered amount            |
| `accountId` | string | ❌       | Financial account ID       |

---

### `GET /api/sales/[id]`

Get single sale details.

---

### `POST /api/sales/[id]/void`

Void a sale. Requires `MANAGER`+ role. Restocks all items.

---

### `POST /api/sales/[id]/refund`

Refund items from a sale. Requires `MANAGER`+ role.

**Request Body:**

| Field   | Type    | Required | Description                          |
|---------|---------|----------|--------------------------------------|
| `items` | array   | ✅       | Items to refund with qty             |
| `reason`| string  | ❌       | Refund reason                        |

---

### `GET /api/sales/by-customer`

Get sales grouped by customer.

---

## 🔄 Returns & Refunds

### `GET /api/returns/[id]`

Get return details by ID.

---

## 👥 Customers

### `GET /api/customers`

List customers.

---

### `POST /api/customers`

Create a customer.

---

### `GET /api/customers/[id]`

Get customer with purchase history.

---

### `PATCH /api/customers/[id]`

Update customer details.

---

### `GET /api/customers/dues`

List customers with outstanding dues.

---

### `POST /api/customers/collect-due`

Collect a due payment from a customer.

---

## 🏭 Suppliers

### `GET /api/suppliers`

List suppliers with payable balances.

---

### `POST /api/suppliers`

Create a supplier.

---

### `GET /api/suppliers/[id]`

Get supplier details + purchase history.

---

### `PATCH /api/suppliers/[id]`

Update supplier.

---

## 📊 Inventory & Stock

### `GET /api/inventory`

List all stock items with branch stock levels.

---

### `GET /api/inventory/low-stock`

List products below reorder level across all branches.

---

### `GET /api/inventory/out-of-stock`

List products with zero stock.

---

### `GET /api/inventory/branch-stock`

List stock per branch.

**Query Parameters:**

| Param      | Type   | Required | Description      |
|------------|--------|----------|------------------|
| `branchId` | string | ❌       | Filter by branch |

---

### `GET /api/inventory/adjustments`

List stock adjustment history.

---

### `POST /api/inventory/adjust`

Create a stock adjustment (increase/decrease). Requires `MANAGER`+ role.

**Request Body:**

| Field       | Type    | Required | Description                  |
|-------------|---------|----------|------------------------------|
| `productId` | string  | ✅       | Product ID                   |
| `branchId`  | string  | ✅       | Branch ID                    |
| `qty`       | number  | ✅       | Positive = increase, negative = decrease |
| `reason`    | string  | ✅       | Adjustment reason             |

---

## 🔄 Stock Transfers

### `GET /api/transfers`

List stock transfers between branches.

---

### `POST /api/transfers`

Create a stock transfer.

**Request Body:**

| Field            | Type    | Required | Description          |
|------------------|---------|----------|----------------------|
| `fromBranchId`   | string  | ✅       | Source branch        |
| `toBranchId`     | string  | ✅       | Destination branch   |
| `items`          | array   | ✅       | Products + quantities|
| `notes`          | string  | ❌       | —                    |

---

### `GET /api/transfers/[id]`

Get transfer details.

---

### `POST /api/transfers/[id]/dispatch`

Mark transfer as dispatched.

---

### `POST /api/transfers/[id]/receive`

Mark transfer as received. Updates stock quantities.

---

### `POST /api/transfers/[id]/cancel`

Cancel a pending transfer.

---

## 💳 Financial Accounts

### `GET /api/accounts`

List financial accounts.

**Response `200`:**

```json
[
  {
    "id": "cmq...",
    "name": "Cash Register",
    "type": "CASH",
    "parentId": null,
    "openingBalance": 0,
    "balance": 15000.00,
    "archived": false,
    "createdAt": "2025-..."
  }
]
```

Account types: `CASH`, `BANK`, `MOBILE_BANKING`, `RECEIVABLE`, `PAYABLE`, `EXPENSE`.

---

### `POST /api/accounts`

Create an account.

---

### `GET /api/accounts/[id]`

Get account details.

---

### `PATCH /api/accounts/[id]`

Update account.

---

### `DELETE /api/accounts/[id]`

Archive an account.

---

### `GET /api/accounts/ledger`

Get ledger transactions for all accounts (or single account via `?accountId=`).

**Response `200`:**

```json
[
  {
    "id": "...",
    "date": "2025-...",
    "type": "SALE",
    "ref": "sale_id",
    "description": "Sale #INV-001",
    "debit": 0,
    "credit": 1500.00,
    "balance": 1500.00
  }
]
```

---

### `POST /api/accounts/transfer`

Transfer between accounts.

**Request Body:**

| Field            | Type   | Required | Description       |
|------------------|--------|----------|-------------------|
| `fromAccountId`  | string | ✅       | Source account    |
| `toAccountId`    | string | ✅       | Target account    |
| `amount`         | number | ✅       | Transfer amount   |
| `note`           | string | ❌       | —                 |

---

### `POST /api/accounts/deposit`

Deposit or withdraw from an account.

**Request Body:**

| Field       | Type   | Required | Description              |
|-------------|--------|----------|--------------------------|
| `accountId` | string | ✅       | Account ID               |
| `direction` | string | ✅       | `"in"` or `"out"`        |
| `amount`    | number | ✅       | Amount                   |
| `note`      | string | ❌       | —                        |

---

## 💸 Expenses

### `GET /api/expenses`

List expenses. Supports date range filtering.

---

### `POST /api/expenses`

Create an expense.

---

### `GET /api/expenses/[id]`

Get expense details.

---

### `PATCH /api/expenses/[id]`

Update expense.

---

### `DELETE /api/expenses/[id]`

Delete expense.

---

## 💵 Cash Shifts

### `GET /api/shifts`

List all cash shifts.

---

### `POST /api/shifts`

Open a new cash shift.

---

### `GET /api/shifts/active`

Get the currently active shift.

**Response `200`:**

```json
{
  "id": "...",
  "openedAt": "2025-...",
  "openingBalance": 5000.00,
  "expectedCash": 0,
  "status": "OPEN"
}
```

**Response `404`:** `{ "error": "NOT_FOUND" }` — no active shift.

---

### `POST /api/shifts/close`

Close the active shift.

**Request Body:**

| Field           | Type   | Required | Description               |
|-----------------|--------|----------|---------------------------|
| `closingBalance`| number | ✅       | Actual cash counted       |
| `notes`         | string | ❌       | Shift notes               |

---

### `GET /api/shifts/expected-cash`

Calculate expected cash amount for the active shift.

---

### `GET /api/shifts/[id]`

Get shift details.

---

## 🔔 Notifications

### `GET /api/notifications`

List notifications for the current user.

---

### `PATCH /api/notifications/[id]`

Mark a notification as read.

---

### `POST /api/notifications/read-all`

Mark all notifications as read.

---

## 🏢 Branches

### `GET /api/branches`

List branches for the current shop.

---

### `POST /api/branches`

Create a new branch.

---

### `GET /api/branches/[id]`

Get branch details.

---

### `PATCH /api/branches/[id]`

Update branch.

---

### `DELETE /api/branches/[id]`

Archive a branch.

---

## 📋 Audit Logs

### `GET /api/audit`

List audit entries. Supports filtering by entity type and action.

**Query Parameters:**

| Param    | Type   | Required | Description                          |
|----------|--------|----------|--------------------------------------|
| `entity` | string | ❌       | Filter: `PRODUCT`, `SALE`, etc.     |
| `action` | string | ❌       | Filter: `CREATE`, `UPDATE`, `DELETE` |

---

### `GET /api/audit/log`

Full audit log (alias for `/api/audit`).

---

### `GET /api/audit/[id]`

Get audit entry details.

---

### `POST /api/audit/[id]/complete`

Mark an audit item as completed.

---

### `POST /api/audit/[id]/cancel`

Cancel an audit item.

---

### `GET /api/audit/[id]/count`

Get audit counts.

---

## 🏪 Storefront (Public)

These endpoints use `publicApiHandler` — no auth required.

### `GET /api/storefront/products`

List published products for the public storefront.

**Query Parameters:**

| Param        | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `search`     | string | ❌       | Search by name                       |
| `categoryId` | string | ❌       | Filter by category                   |
| `page`       | number | ❌       | Page number (future pagination)      |

---

### `GET /api/storefront/products/[slug]`

Get a single product by slug for the storefront.

---

### `POST /api/storefront/checkout`

Create a storefront order (public checkout).

**Request Body:**

| Field        | Type    | Required | Description               |
|--------------|---------|----------|---------------------------|
| `items`      | array   | ✅       | Products + quantities     |
| `customer`   | object  | ✅       | { name, email, phone }   |
| `shippingAddress` | object | ❌  | Address details           |
| `tenders`    | array   | ✅       | Payment methods           |

---

## 🖼️ Uploads

### `POST /api/upload`

Upload an image to Cloudinary.

**Request:** `multipart/form-data` with `file` field.

**Response `200`:**

```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "products/abc123"
}
```

**Error `503`:** `{ "error": "CONFIG_ERROR" }` — Cloudinary not configured.

---

## ❌ Error Codes

| Error Code           | HTTP Status | Description                          |
|----------------------|-------------|--------------------------------------|
| `UNAUTHENTICATED`    | 401         | No session or invalid token          |
| `FORBIDDEN`          | 403         | Insufficient role (e.g. CASHIER trying MANAGER action) |
| `NOT_FOUND`          | 404         | Resource not found                   |
| `CONFLICT`           | 409         | Resource conflict (e.g. delete category with products) |
| `VALIDATION`         | 422         | Zod validation failed                |
| `RATE_LIMITED`       | 429         | Too many requests                    |
| `INTERNAL`           | 500         | Unknown server error                 |
| `CONFIG_ERROR`       | 503         | Missing configuration (Cloudinary, etc.) |

---

## 📐 API Patterns

### Authentication

All protected endpoints check the session via `auth()`. Anonymous requests get `401 UNAUTHENTICATED`.

### Authorization

RBAC roles: `OWNER` > `MANAGER` > `CASHIER` > `VIEWER`.

- `OWNER`: Full access, can manage users/shop settings
- `MANAGER`: Can CRUD products, purchases, customers, suppliers
- `CASHIER`: Can create sales, view products
- `VIEWER`: Read-only

### Tenant Isolation

All queries are scoped by `shopId` (extracted from the session). Cross-tenant access is prevented at the service layer — every Prisma query includes `WHERE shopId = ctx.shopId`.

### Response Shape

- Success: **direct JSON body** (array or object)
- Error: `{ error: "ERROR_CODE", message?: string, issues?: [] }`

### Pagination

⚠️ **Not yet implemented.** All list endpoints return all records. Future: `?cursor=&take=50`.

---

*Generated for POS 360 — Full-stack Inventory + POS System*
