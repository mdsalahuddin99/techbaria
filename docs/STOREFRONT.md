The public-facing storefront is a separate route segment that shares the same database and codebase as the POS/admin app. এটি একই শেয়ার্ড ডাটাবেজ ব্যবহার করে।

> Companion: `BACKEND.md`, `docs/DATABASE.md`, `docs/technical-architecture-audit.md`.

---

## 1. Architecture

- One backend → POS (admin, authenticated) + Storefront (public)
- Sales via storefront tagged `channel = "STOREFRONT"` — POS sales are `channel = "POS"`
- Public pages get **SSR** (product detail, SEO metadata)
- Cart is client-side Zustand with `persist` middleware (localStorage)
- Checkout is client-side — calls `POST /api/storefront/checkout`

---

## 2. Routes

| Path | Page | Render |
|------|------|--------|
| `/storefront` | Storefront Home (→ redirect to /shop) | Server |
| `/storefront/shop` | Product Catalog | Server + Client filters |
| `/storefront/p/[slug]` | Product Detail | Server (SEO) |
| `/storefront/search` | Search | Client |
| `/storefront/cart` | Cart | Client |
| `/storefront/checkout` | Checkout Form | Client |
| `/storefront/order/[id]` | Order Success | Client |
| `/storefront/track` | Order Tracking | Client |
| `/storefront/wishlist` | Wishlist | Client |
| `/storefront/compare` | Compare | Client |
| `/storefront/account` | Account | Client |

**Note:** `(storefront)` is a route group. The `proxy.ts` rewrites `/storefront/*` to the actual routes (e.g. `/storefront/p/[slug]` → `/p/[slug]`).

---

## 3. Folder layout

```text
app/(storefront)/
├── layout.tsx                # public layout (no admin chrome)
├── shop/[[...category]]/page.tsx
├── p/[slug]/page.tsx
├── search/page.tsx
├── cart/page.tsx
├── checkout/page.tsx
├── order/[id]/page.tsx
├── track/page.tsx
├── wishlist/page.tsx
├── compare/page.tsx
└── account/page.tsx

src/features/storefront/
├── components/               # UI components
├── hooks/                    # useCheckout, useAdminOrders, etc.
├── lib/                      # utils, formatPrice, persistOrder
└── types.ts                  # StorefrontOrder, CartItem, etc.

app/api/storefront/
├── checkout/route.ts          # POST — creates Sale(channel=STOREFRONT)
├── orders/route.ts            # GET — admin list (paginated)
├── orders/[id]/route.ts       # GET — public single order
└── orders/[id]/status/route.ts# PATCH — admin update status
```

---

## 4. Data Flow

### Checkout Flow

```
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
3. Persist to localStorage (fallback)
4. router.push("/storefront/order/[id]")
5. Cart cleared
```

**Dual persistence principle:** Checkout প্রথমে API call করে। API সফল হলে order DB-তে save হয় + localStorage-ও update হয়। API fail করলে শুধু localStorage-এ save হয় (zero data loss).

### Admin Order Viewing

```
Admin Dashboard
  → useAdminStorefrontOrders()
     ├─ GET /api/storefront/orders?perPage=200
     └─ Merge with localStorage orders (backward compat)
```

### Order Detail (Storefront)

```
order/[id]/page.tsx
  ├─ GET /api/storefront/orders/{id}
  └─ Fallback to getStoredOrder(id) from localStorage
```

---

## 5. Data Model

Storefront orders use the **same `Sale` table** as POS. There is no separate `StorefrontOrder` table.

| Field | POS Sale | Storefront Order |
|-------|----------|-----------------|
| `channel` | `"POS"` | `"STOREFRONT"` |
| `status` | `COMPLETED | VOIDED | REFUNDED` | `COMPLETED` |
| `data.storefrontStatus` | — | `pending | confirmed | shipped | delivered | cancelled` |
| `tenders` | Actual tender entries | Empty (COD — `due = total`) |
| `data` | — | `{ orderNo, customer, shipping, paymentMethod }` |

This design means:
- Admin sees both POS and online orders in one view
- Reports can filter by `channel`
- Same `Sale` serialization infrastructure

---

## 6. Public API — Single Tenant Global Access

Public storefront routes do not require any session. Since the system is single-tenant:
- All product catalog and category API endpoints return data directly from the global database without tenant filters.
- Orders/sales created from the storefront are simply saved with `channel: "STOREFRONT"` and `paid: 0` (for COD orders) in the database.
- Subdomain lookups and query scoping by `shopId` are no longer performed.

---

## 7. SEO

- `(storefront)/layout.tsx` exports default metadata
- Product detail page uses `generateMetadata` for dynamic OG/title per product
- Storefront pages support SSR for search engine indexing

---

## 8. Cart (Zustand, client only)

```ts
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [] as CartItem[],
      add: (item) => set(s => ({ items: mergeItem(s.items, item) })),
      remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      setQty: (id, qty) => set(s => ({ items: s.items.map(i => i.id === id ? { ...i, qty } : i) })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((a, i) => a + i.price * i.qty, 0),
    }),
    { name: "shopflow-cart-v1", storage: createJSONStorage(() => localStorage) }
  )
);
```

Cart lives exclusively in the browser — no server rendering. Zustand's `persist` middleware keeps it in localStorage across sessions.

---

## 9. Image Handling

- Storage: Cloudinary
- Component: `next-cloudinary`'s `<CldImage>` — automatic responsive + format negotiation
- Don't use `next/image` with Cloudinary URLs (unless you configure `remotePatterns`)

---

## 10. Split POS vs Storefront in Reports

```ts
// admin reports
salesService.list(ctx, { channel: "STOREFRONT" })  // online orders only
salesService.list(ctx, { channel: "POS" })           // POS sales only
salesService.list(ctx, {})                           // all
```
