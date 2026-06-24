The public-facing storefront is a separate route segment that shares the same database and codebase as the POS/admin app. এটি একই শেয়ার্ড ডাটাবেজ ব্যবহার করে।

> Companion: `BACKEND.md`, `docs/DATABASE.md`, `docs/technical-architecture-audit.md`.

**Last updated:** June 2026 — reflects current implementation and known gaps.

---

## 1. Architecture

- **One backend** → POS (admin, authenticated) + Storefront (public, no session required)
- Storefront orders are saved as `Sale` rows with `channel = "STOREFRONT"`; POS sales use `channel = "POS"`
- **Cart** is client-side Zustand with `persist` → `localStorage` (`storefront-cart-v1`)
- **Checkout** is client-side → `POST /api/storefront/checkout`
- **Product catalog** is fetched via public API; filtering/sorting runs on the client (TanStack Query cache key `["storefront", "products"]`)
- **All storefront pages are currently client components** (`"use client"`). Per-page SEO uses the `useSeo` hook (sets `document.title` / meta tags in the browser). There is **no** `generateMetadata` or server-rendered product HTML yet.

### URL model

Browser URLs use the `/storefront/*` prefix. `middleware.ts` rewrites them to internal App Router paths (the `(storefront)` route group does not appear in the URL):

```text
Browser URL              Middleware rewrite        Internal file
──────────────────────────────────────────────────────────────────
/storefront              → /shop                   shop/[[...category]]/page.tsx
/storefront/shop         → /shop                   shop/[[...category]]/page.tsx
/storefront/shop/Mobile  → /shop/Mobile            shop/[[...category]]/page.tsx
/storefront/p/[slug]     → /p/[slug]               p/[slug]/page.tsx
/storefront/cart         → /cart                   cart/page.tsx
…
```

Root `/` redirects to `/shop` (internal path) via `app/page.tsx` — not to `/storefront`.

Public API routes under `/api/storefront/*` are **exempt from auth middleware** and do not require a session.

---

## 2. Routes

| Public URL | Internal path | Page file | Render | Notes |
|------------|---------------|-----------|--------|-------|
| `/storefront` | `/shop` | `shop/[[...category]]/page.tsx` | Client | **No dedicated homepage** — rewrites to catalog |
| `/storefront/shop` | `/shop` | same | Client | Full catalog + filters |
| `/storefront/shop/[category]` | `/shop/[category]` | same | Client | Category via URL segment |
| `/storefront/p/[slug]` | `/p/[slug]` | `p/[slug]/page.tsx` | Client | Product detail |
| `/storefront/search` | `/search` | `search/page.tsx` | Client | Search results |
| `/storefront/cart` | `/cart` | `cart/page.tsx` | Client | Cart |
| `/storefront/checkout` | `/checkout` | `checkout/page.tsx` | Client | Checkout form |
| `/storefront/order/[id]` | `/order/[id]` | `order/[id]/page.tsx` | Client | Order confirmation |
| `/storefront/track` | `/track` | `track/page.tsx` | Client | Order lookup |
| `/storefront/wishlist` | `/wishlist` | `wishlist/page.tsx` | Client | Wishlist |
| `/storefront/compare` | `/compare` | `compare/page.tsx` | Client | Compare table |
| `/storefront/account` | `/account` | `account/page.tsx` | Client | Order history (auth required) |

**Missing route:** `app/(storefront)/page.tsx` — a dedicated marketing homepage is planned but not yet wired.

---

## 3. Folder layout

```text
app/(storefront)/
├── layout.tsx                     # Header, footer, mobile nav, ticker, quick-view, compare tray
├── shop/[[...category]]/page.tsx  # Catalog (currently acts as default landing)
├── p/[slug]/page.tsx              # Product detail
├── search/page.tsx
├── cart/page.tsx
├── checkout/page.tsx
├── order/[id]/page.tsx
├── track/page.tsx
├── wishlist/page.tsx
├── compare/page.tsx
└── account/page.tsx

src/features/storefront/
├── components/
│   ├── home/                      # Homepage sections (built, mostly unwired)
│   │   ├── BentoHero.tsx
│   │   ├── HeroBanner.tsx
│   │   ├── CategoryRail.tsx
│   │   ├── FeaturedProducts.tsx
│   │   ├── FlashDealsSection.tsx
│   │   ├── TrustStrip.tsx
│   │   ├── BrandsRow.tsx
│   │   └── LiveDealTicker.tsx     # Used in layout.tsx
│   ├── layout/                    # Header, footer, mobile bottom bar
│   ├── product/                   # ProductCard, ProductGrid, QuickViewDialog
│   ├── cart/                      # CartLineItem, CartSummary
│   ├── filters/                   # ShopFilters, SortMenu, ActiveFilterChips
│   ├── search/                    # SmartSearch
│   └── compare/                   # CompareTray
├── hooks/
│   ├── useStorefrontProducts.ts   # Public catalog (TanStack Query)
│   ├── useProductDetail.ts
│   ├── useCheckout.ts
│   ├── useStorefrontCategories.ts
│   └── useAdminOrders.ts          # Admin dashboard only
├── store/
│   ├── useCartStore.ts
│   ├── useWishlistStore.ts
│   ├── useCompareStore.ts
│   ├── useQuickViewStore.ts
│   └── useRecentSearchesStore.ts
├── lib/
│   ├── formatPrice.ts
│   └── seo.ts                     # Client-side useSeo hook
└── types.ts

app/api/storefront/
├── products/route.ts              # GET — published product catalog
├── products/[slug]/route.ts       # GET — single product by slug
├── checkout/route.ts              # POST — creates Sale(channel=STOREFRONT)
├── orders/route.ts                # GET — admin list (auth required)
├── orders/[id]/route.ts           # GET — single order (public handler)
├── orders/[id]/status/route.ts    # PATCH — admin status update
├── my-orders/route.ts             # GET — authenticated VIEWER orders
└── customers/route.ts             # GET — admin VIEWER users list
```

**Note:** `src/features/storefront/components/layout/StorefrontLayout.tsx` duplicates `app/(storefront)/layout.tsx` but is **not used** by the app.

---

## 4. Homepage (current vs planned)

### Current behaviour

There is **no dedicated homepage**. `/storefront` rewrites to `/shop`, so visitors land on a filter-heavy catalog with a small hero band — not a curated marketing landing page.

### Built-but-unwired components

These live under `src/features/storefront/components/home/` and are ready to compose a homepage:

| Component | Purpose | Wired? |
|-----------|---------|--------|
| `BentoHero` | Hero + smart search + featured product bento grid | No |
| `HeroBanner` | Alternate hero layout | No |
| `CategoryRail` | Horizontal category scroller | No |
| `FlashDealsSection` | Discount / deals section | No |
| `FeaturedProducts` | Featured product grid | No |
| `TrustStrip` | Trust badges (delivery, warranty, etc.) | No |
| `BrandsRow` | Brand logos row | No |
| `LiveDealTicker` | Promo marquee | Yes — in `layout.tsx` |

Supporting hooks already exist: `useFeaturedProducts()`, `useFlashDeals()`, `useStorefrontCategories()`.

### Planned homepage layout

```text
LiveDealTicker (layout)
  → BentoHero
  → CategoryRail
  → FlashDealsSection
  → FeaturedProducts
  → TrustStrip
  → BrandsRow
  → CTA → /storefront/shop
```

Implementation requires adding `app/(storefront)/page.tsx` and changing the middleware rewrite so `/storefront` maps to `/` (homepage) instead of `/shop`.

---

## 5. Data flow

### Product catalog

```text
Client page
  → useStorefrontProducts()          # TanStack Query
     → GET /api/storefront/products   # isPublished=true, no auth
     → filter / sort client-side
```

Categories and brands are **derived client-side** from the full catalog — there is no separate storefront categories API.

**Important:** Some public pages incorrectly call `useProducts()` (admin hook, requires auth). This breaks wishlist, compare, and shop price-filter bounds for anonymous visitors. These should use `useStorefrontProducts()` instead.

### Checkout flow

```text
Client                                       Server
──────                                       ──────
1. User fills checkout form
2. POST /api/storefront/checkout      ───►   publicApiHandler
                                             ├─ Zod validate payload
                                             ├─ salesService.createStorefrontOrder({
                                             │     channel: "STOREFRONT",
                                             │     items, address, shippingMethod,
                                             │     paymentMethod
                                             │   })
                                             ├─ stock decremented in $transaction
                                             └─ return { StorefrontOrder }
3. persistOrder() → localStorage (storefront-orders-v1)
4. router.push("/storefront/order/[id]")
5. Cart cleared
```

**Dual persistence:** Checkout tries the API first. On success the order is in the DB and localStorage. On API failure, dev falls back to localStorage-only; **production throws** (no silent offline order).

**Shipping rates (hardcoded):** Inside Dhaka ৳70, Outside Dhaka ৳130, Pickup free.

**Payment methods:** COD works end-to-end (`paid: 0`, `due = total`). bKash, Nagad, and Card are **UI labels only** — no payment gateway integration yet.

### Order confirmation

```text
order/[id]/page.tsx
  ├─ GET /api/storefront/my-orders   (requires session — often 401 for guests)
  └─ Fallback: getStoredOrder(id) from localStorage
```

The public `GET /api/storefront/orders/[id]` endpoint exists but order/account pages do not use it for guest lookup yet.

### Admin order viewing

```text
Admin Dashboard → /dashboard/online-orders
  → useAdminStorefrontOrders()
     ├─ GET /api/storefront/orders?perPage=200   (auth required)
     └─ Merge with localStorage orders (backward compat)
```

---

## 6. Data model

Storefront orders use the **same `Sale` table** as POS. There is no separate `StorefrontOrder` table.

| Field | POS Sale | Storefront Order |
|-------|----------|-----------------|
| `channel` | `"POS"` | `"STOREFRONT"` |
| `status` | `COMPLETED \| VOIDED \| REFUNDED` | `COMPLETED` |
| `data.storefrontStatus` | — | `pending \| confirmed \| shipped \| delivered \| cancelled` |
| `tenders` | Actual tender entries | Empty (COD — `due = total`) |
| `data` | — | `{ orderNo, customer, shipping, paymentMethod }` |

Benefits: admin sees POS and online orders together; reports filter by `channel`; shared serialization.

Products visible on the storefront must have `isPublished: true`.

---

## 7. Public API — single tenant

Public storefront routes do not require a session. The system is single-tenant:

- Product catalog returns published products from the global database (no tenant / shopId scoping).
- Checkout creates `Sale` rows with `channel: "STOREFRONT"`.
- Admin-only endpoints (`/api/storefront/orders`, `/api/storefront/customers`, status PATCH) require authentication via middleware + `apiHandler`.

---

## 8. Client state (Zustand + localStorage)

| Store / key | Purpose |
|-------------|---------|
| `useCartStore` → `storefront-cart-v1` | Cart lines (guest-safe) |
| `useWishlistStore` | Saved product IDs |
| `useCompareStore` | Compare list (max 4) |
| `useQuickViewStore` | Quick-view modal state |
| `useRecentSearchesStore` | Search history |
| `storefront-orders-v1` | Order backup after checkout |

Cart shape (`CartLine`): `productId`, `name`, `price`, `qty`, `maxStock`, optional `imageUrl` / `emoji`.

Cart is browser-only — no server sync. Prices are snapshotted at add-to-cart time; checkout does not revalidate price/stock against the server before placing the order.

---

## 9. SEO & discoverability

### Current implementation

- **`useSeo` hook** (`src/features/storefront/lib/seo.ts`) — client-side `document.title` and optional `<meta name="description">`. Crawlers that do not execute JS see root app metadata (`ShopFlow POS`), not per-product titles.
- **`OrganizationJsonLd`** in storefront layout (name currently `"ShopFlow"`).
- **`ProductJsonLd`** exists in `src/shared/components/JsonLd.tsx` but is **not used** on product pages.
- **`app/sitemap.ts`** — static storefront URLs + dynamic product pages using **`slug`** (`/storefront/p/{slug}`).
- **`app/robots.ts`** — allows storefront paths.

### Known SEO gaps

| Issue | Detail |
|-------|--------|
| No SSR / `generateMetadata` | All storefront pages are client-rendered |
| Slug vs ID mismatch | UI links use `product.id`; sitemap and API use `slug` |
| Branding split | UI shows "AmarShop"; root metadata shows "ShopFlow" |
| Stale sitemap entry | `/landing` listed but no page exists |
| Shop settings not reflected | Dashboard Shop Setup (name, logo, phone) not wired to storefront metadata |

---

## 10. Image handling

- Product images use plain `<img>` tags in storefront components.
- Admin/product forms may use Cloudinary via `ImageUpload`; storefront does **not** currently use `next/image` or `next-cloudinary`'s `<CldImage>`.
- Product model supports `imageUrl` and `images[]`; UI mostly renders a single `imageUrl` (detail page adds mock query-string "angles" when only one image exists).

---

## 11. UI shell & navigation

`app/(storefront)/layout.tsx` provides:

- Dark theme shell (`#020617` background)
- Google Fonts loaded at runtime (Sora, Manrope, Hind Siliguri)
- `LiveDealTicker`, `StorefrontHeader`, `StorefrontFooter`
- `MobileBottomBar` (Home → `/storefront`, Shop, Wishlist, Cart, Account)
- `QuickViewDialog`, `CompareTray`

Mobile bottom nav "Home" highlights only when pathname is exactly `/storefront` (rewritten internally to `/shop`).

---

## 12. Feature status

### Implemented (MVP)

- Public product catalog with category, brand, price, stock, and sale filters
- Product detail (gallery, qty, add to cart, buy now, tabs)
- Client cart with persistence
- Guest checkout (COD) → DB + localStorage
- Admin online orders dashboard with status workflow
- Wishlist, compare, quick view, smart search (client-only)
- Mobile-responsive layout and bottom navigation

### Partial / broken

| Feature | Issue |
|---------|-------|
| Wishlist / compare pages | Use admin `useProducts()` — empty for guests |
| Shop price filter bounds | Same — `useProducts()` fails without auth |
| Product URLs | Links use `id`; route param is named `slug` |
| Order tracking (guest) | Relies on localStorage; public order API unused |
| Account page | Requires auth; no storefront login/register |
| Product variants | Color/storage selectors are mock UI — no DB variants |
| Reviews | Hardcoded mock data on product detail |
| Payment (bKash/Nagad/Card) | UI only |

### Not implemented

- Dedicated marketing homepage (`page.tsx`)
- Payment gateway integration
- Storefront customer auth (login / register / OTP)
- Coupon / promo codes at checkout
- Order email / SMS notifications
- Real review system
- Dynamic branding from Shop Setup settings
- Server-side rendering and Open Graph metadata
- API pagination (full catalog fetched on every query)
- CDN / `next/image` optimization on storefront

---

## 13. Split POS vs storefront in reports

```ts
// admin reports
salesService.list(ctx, { channel: "STOREFRONT" })  // online orders only
salesService.list(ctx, { channel: "POS" })         // POS sales only
salesService.list(ctx, {})                         // all
```

---

## 14. Roadmap (recommended phases)

### Phase 1 — Foundation (homepage + critical fixes)

1. Add `app/(storefront)/page.tsx` — wire home components (`BentoHero`, `CategoryRail`, `FlashDealsSection`, `FeaturedProducts`, `TrustStrip`, `BrandsRow`)
2. Update middleware: `/storefront` → homepage; `/storefront/shop` → catalog only
3. Replace `useProducts()` with `useStorefrontProducts()` on shop, wishlist, compare
4. Fix all product links to use `product.slug`
5. Wire Shop Setup settings (name, logo, phone) into header, footer, and SEO
6. Remove or hide mock reviews and fake variant selectors until backed by data

### Phase 2 — Core commerce

1. SSR product pages + `generateMetadata` + `ProductJsonLd`
2. Paginated `/api/storefront/products` (stop full-catalog client fetch)
3. Checkout price/stock revalidation before order creation
4. `next/image` or Cloudinary on storefront
5. Fix sitemap (remove `/landing`; verify slug URLs match app links)

### Phase 3 — Trust & conversion

1. Payment gateway (SSLCommerz / bKash / Nagad)
2. Storefront customer auth + guest order lookup (phone + order number)
3. Order notifications (SMS / email)
4. Static policy pages (returns, warranty, privacy)
5. Coupon field on checkout

### Phase 4 — Premium

1. Real product variants (DB + cart + checkout sync)
2. Multi-image gallery from `images[]`
3. Verified purchase reviews
4. Analytics (GA4 / Meta Pixel)
5. Consistent i18n (BN / EN toggle)

---

## 15. Development notes

- **Testing storefront locally:** Open `/storefront` or `/storefront/shop`. Ensure products have `isPublished: true` in admin.
- **Do not call admin hooks from public pages.** Use `useStorefrontProducts`, `useProductDetail`, and public API routes only.
- **Cart storage key:** `storefront-cart-v1` — separate from any POS cart state.
- **Brand name in UI:** Currently hardcoded as "AmarShop" in components; should eventually read from Shop Setup settings.
