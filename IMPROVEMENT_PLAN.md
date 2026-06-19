# 🏗️ Senior Next.js Engineer — Full Project Audit

## ShebaTech360 (Next.js 16 / Prisma / PostgreSQL / Upstash Redis)

---

## 1. 🏛️ Architecture

### ✅ Strengths

| Aspect | Status | Details |
|--------|--------|---------|
| **Routing** | ✅ **Sound** | Next.js 16 App Router `(group)` pattern — clean separation: `(dashboard)`, `(storefront)`, `(auth)`, `(marketing)` |
| **Proxy pattern** | ✅ | `proxy.ts` handles auth + storefront rewrites + backward-compat redirects. Middleware deprecated → migrated correctly |
| **Service layer** | ✅ | All Prisma logic in `src/server/services/` — framework-agnostic, testable |
| **Multi-tenancy** | ✅ | Every query scoped by `ctx.shopId` |
| **RBAC** | ✅ | `requireRole(ctx, "MANAGER")` — roles: SUPER_ADMIN, OWNER, MANAGER, CASHIER, VIEWER |

### ⚠️ Concerns

| # | Issue | Impact | Fix Priority |
|---|-------|--------|:------------:|
| **A1** | **No API versioning** — `/api/products`, `/api/sales` — no `/api/v1/` prefix. Frontend contract changes break everything | Mobile app যোগ করলে সমস্যা | 🟡 Medium |
| **A2** | **Service layer ↔ API layer overlap** — `salesService.create()` has 200+ lines. Some validation lives in service, some in Zod schema, some halfway. Single source of truth নেই | Bug-prone | 🟡 Medium |
| **A3** | **No error boundary in routes** — `apiHandler` catches errors, but no per-route Sentry context | Debugging কঠিন | 🟢 Low |
| **A4** | `encodeNotes()` — purchase meta-data in `notes` field as JSON (`_m`, `_n`, `_items`). Clever but fragile — no migration safety, search impossible | Queries become complex | 🟢 Low |

### 🔧 Recommendation

> **Short term:** Refactor `salesService.create()` — split into `validate()`, `create()`, `postProcess()`.  
> **Medium term:** Add `/api/v1/` prefix + deprecate old.

---

## 2. 🗄️ Database (Prisma + PostgreSQL on Neon)

### ✅ Strengths

| Aspect | Status | Details |
|--------|--------|---------|
| **Schema design** | ✅ | 30 models, good normalization, `shopId` on every entity (multi-tenant) |
| **Keep-alive** | ✅ | Neon free-tier auto-suspend handled via `startKeepAlive()` — 3 min ping |
| **Connection management** | ✅ | Singleton `PrismaClient` on `globalThis` (HMR-safe) |
| **Cursor pagination** | ✅ | `paginate()` — opaque cursor, not offset. Scalable for large tables |

### ⚠️ Concerns

| # | Issue | Impact | Fix Priority |
|---|-------|--------|:------------:|
| **D1** | **No Prisma migrations** — using `prisma db push`. Schema drift possible, no rollback | 🔴 **Critical for production** | 🔴 High |
| **D2** | **`Product.stock` is a Denormalized Counter** — for `trackSerials: true`, stock should be `COUNT(SerialNumber WHERE status = 'IN_STOCK')`. Currently single source of truth নেই. Sale → stock decrement + serial SOLD — two writes, can drift | Stock mismatch bugs | 🔴 High |
| **D3** | **No database indexes** (except Prisma defaults on PK/FK). `shopId`, `createdAt`, `status` on large tables (SerialNumber, Sale, AuditLog) — full table scans possible | Performance degradation at scale | 🟡 Medium |
| **D4** | **No soft-delete** — `PurchaseItem` delete cascades. If a purchase is accidentally deleted, serials are orphaned | Data integrity risk | 🟡 Medium |
| **D5** | **No audit trigger on DB level** — all audit via application code (`auditLogService.log()`). Skip-able if bug in code | Audit gap | 🟢 Low |

### 🔧 Recommendation

> **Immediate:** `npx prisma migrate dev --name init` to switch from `db push` to migrations.  
> **High priority:** Add indexes (`shopId + status + createdAt` on Sales, SerialNumber).  
> **Medium:** For `trackSerials: true`, derive stock from `COUNT(SerialNumber.IN_STOCK)` instead of denormalized `Product.stock`.

---

## 3. 🔗 API Layer

### ✅ Strengths

| Aspect | Status | Details |
|--------|--------|---------|
| **`apiHandler` wrapper** | ✅ | Consistent auth + error handling + logging + requestId — every route |
| **Zod validation** | ✅ | `parseBody(req, schema)` — strong typed validated |
| **ServiceError mapping** | ✅ | `NOT_FOUND` → 404, `FORBIDDEN` → 403, `VALIDATION` → 400 |
| **Structured logging** | ✅ | Pino with requestId correlation |

### ⚠️ Concerns

| # | Issue | Impact | Fix Priority |
|---|-------|--------|:------------:|
| **API1** | **Frontend calls API directly** — `salesApi.create(data)` → `fetch("/api/sales")`. No GraphQL, no tRPC. Every page loads multiple resources separately | N+1 waterfall | 🔴 High |
| **API2** | **POS page makes 5 separate API calls on mount** — products, customers, accounts, branches, settings. If any one is slow, UI blocks | Slow POS load | 🔴 High |
| **API3** | **No request deduplication** — if two components on same page both call `useProductsQuery()`, they each make a separate fetch (unless React Query dedup catches it) | Redundant bandwidth | 🟡 Medium |
| **API4** | **Quick Customer creation** — POS checkout creates customer via separate `customersApi.create()` before the sale API call. This is a separate round-trip | 1 extra round-trip per sale | 🟢 Low |
| **API5** | **Storefront checkout** — creates sale via `POST /api/storefront/checkout`, but stock validation & serial assign lives in `salesService.createStorefrontOrder()`. Logic duplication with POS checkout | 2 code paths to maintain | 🟡 Medium |

### 🔧 Recommendation

> **High priority:** Implement **Parallel data fetching** on POS — use `Promise.allSettled` on mount, or a single `GET /api/pos/init` that returns products + customers + accounts + settings in one response.  
> **Medium:** Evaluate tRPC or GraphQL for future — currently fetch per entity is fine for < 10 pages, but won't scale.

---

## 4. 🖥️ Frontend Data Flow

### ✅ Strengths

| Aspect | Status | Details |
|--------|--------|---------|
| **React Query** | ✅ | `useQuery` with `QueryTier.MASTER_DATA` (60s staleTime), `queryClient.invalidateQueries` on mutations |
| **Query tiers** | ✅ | MASTER_DATA, TRANSACTION, INVENTORY, REFERENCE, REPORT — well thought out |
| **Zustand for local state** | ✅ | POS cart state in `usePosStore` — instant reactivity, no server round-trip |
| **Serial sync with cart** | ✅ | `safeAddToCart` assigns specific scanned serial to cart item |

### ⚠️ Concerns

| # | Issue | Impact | Fix Priority |
|---|-------|--------|:------------:|
| **F1** | **`usePosScreenData()` bundles all reads in one hook** — `useProductsQuery()`, `useCustomersQuery()` — but each is its own `useQuery`. React Query runs them in parallel, but **no loading state guarantees**. | Page load-এ blank state | 🟡 Medium |
| **F2** | **No Suspense boundary on POS page** — the entire page is `"use client"` with manual loading states. React 18 `<Suspense>` could show skeletons for each section | Suboptimal UX | 🟢 Low |
| **F3** | **Cache invalidation too aggressive** — `confirmCheckout()` invalidates 4 query keys. Products + Customers + Accounts rarely change per sale. Only Sales key needs invalidation | Unnecessary refetches | 🟡 Medium |
| **F4** | **Checkout flow — no optimistic update** — user clicks "Confirm" → `checkout()` API waits → then cart clears. No instant UI feedback | Perceived slowness | 🟡 Medium |
| **F5** | **Storefront check** — `useStorefrontProducts()` hook directly calls `fetch("/api/storefront/products")` instead of through the api-client layer | Bypasses error handling | 🟢 Low |

### 🔧 Recommendation

> **Immediate:** Optimize cache invalidation — only invalidate `saleKeys` on sale, not all 4 keys. Products/customers/accounts almost never change per sale.  
> **Medium:** Add optimistic update for POS checkout — clear cart immediately, revert on error.

---

## 5. ⚡ Performance

### Current Measurements (from terminal logs)

| API | Current | Target | Gap |
|-----|:-------:|:------:|:---:|
| `GET /api/products` | **2.5s** | <200ms | ❌ 12× |
| `GET /api/customers` | 1.0s | <200ms | ❌ 5× |
| `GET /api/accounts` | 1.0s | <200ms | ❌ 5× |
| `GET /api/categories?flat=true` | 2.6s | <200ms | ❌ 13× |
| `GET /api/sales` | ~1.0s | <200ms | ❌ 5× |
| `GET /api/purchases` | ~1.0s | <200ms | ❌ 5× |
| `GET /api/branches` | ~1.0s | <200ms | ❌ 5× |
| **POS page total load** | **~8-10s** | **<1s** | ❌ **10×** |
| **Sale create (checkout)** | **~1.5s** | **<500ms** | ⚠️ 3× |

### Bottleneck Analysis

#### Bottleneck 1: 🔴 **Redis cache disabled** — No `UPSTASH_REDIS_REST_URL`

`cache.ts` graceful degradation works — but silently. Every API call goes to DB:

```
products list → 2.5s DB (would be 50ms cached)
categories list → 2.6s DB (would be 30ms cached)
```

#### Bottleneck 2: 🟡 **No Prisma query logging in production**

```ts
log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
```
`["query"]` not included. Can't see slow queries in production.

#### Bottleneck 3: 🟡 **POS page — sequential data loading**

POS page loads data via React Query. Although queries run in parallel, the **page renders in stages**:
1. Renders with empty data (loading states)
2. Products arrive (2.5s later) → re-render
3. Customers arrive (1s later) → re-render
4. Accounts arrive (1s later) → re-render

**Three re-renders = cumulative layout shift.**

### 🔧 Performance Recommendations

| Priority | Action | Expected Gain |
|:--------:|--------|:-------------:|
| 🔴 **P0** | **Enable Redis** — add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.local` | **Products: 2.5s → 50ms** |
| 🔴 **P0** | **Add DB indexes** — `shopId + status + createdAt` on Sale, SerialNumber, Purchase, AuditLog | **2.5s → 300ms** |
| 🔴 **P1** | **POS init endpoint** — single `GET /api/pos/init` returning products + customers + accounts + branches + settings | **5 round-trips → 1 round-trip** |
| 🟡 **P2** | **Reduce transaction timeout** — `15000` → `5000` | Faster failure recovery |
| 🟡 **P2** | **Reduce cache invalidation** — don't invalidate products/customers/accounts on every sale | Less refetch on dashboard |
| 🟢 **P3** | **Add Prisma query logging** in production (`log: ["query", "warn", "error"]`) | Visibility |
| 🟢 **P3** | **Add Suspense boundaries** — POS product grid, customer list, etc. each with skeleton | Perceived performance |

---

## 📊 Overall Project Maturity

| Dimension | Score | Verdict |
|-----------|:-----:|---------|
| **Code Organization** | 8/10 | Clean service layer, good separation |
| **TypeScript Safety** | 7/10 | Some `any` casts in serialization layer |
| **Error Handling** | 8/10 | Good — ServiceError + apiHandler + Zod |
| **Data Flow** | 6/10 | Frontend data loading needs optimization |
| **Database Design** | 7/10 | Good schema, no migrations, no indexes |
| **Performance** | 4/10 | 🔴 **Slow — Redis disabled, no indexes, N+1 queries** |
| **Security** | 7/10 | Auth.js, RBAC, CSRF, rate limiting |
| **Test Coverage** | 5/10 | Some tests exist (`__tests__` folders) but not comprehensive |
| **Caching Strategy** | 5/10 | Good design but **disabled** in production |
| **DevOps** | 6/10 | No Docker, no CI/CD visible, no migration strategy |

### Overall: **6.3/10** — Good foundation, performance needs immediate attention

---

## 🎯 Top 5 Immediate Actions

```
 1. 🔴 Enable Redis → products: 2.5s → 50ms
 2. 🔴 Add DB indexes → sales: 1.0s → 100ms
 3. 🔴 Create POS init endpoint → 5 API calls → 1
 4. 🟡 Switch from db push to migrations
 5. 🟡 Fix stock denormalization (derive from serial count)
```

**Target state (after these 5):** POS load <1s, checkout <500ms, products <100ms.
