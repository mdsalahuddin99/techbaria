# Backend Architecture (Current State)

এই ডকুমেন্টে ShebaTech 360-এর backend architecture, request flow, এবং design decisions বিস্তারিত আছে।

> Companion docs: `docs/DATABASE.md` (schema), `docs/technical-architecture-audit.md` (deep-dive audit), `docs/LOCAL_SETUP.md` (local dev setup).

---

## 1. Stack

| Concern        | Choice                                  | Why                                                          |
| -------------- | --------------------------------------- | ------------------------------------------------------------ |
| API style      | Route Handlers (Node runtime)           | Standard `Request`/`Response` — Vercel-agnostic              |
| Auth           | Auth.js v5 + Prisma Adapter             | JWT sessions, Google + Credentials, portable                 |
| ORM            | Prisma                                  | Type-safe, migrations, generates TS types                    |
| DB             | PostgreSQL (Neon → self-host)           | Standard `DATABASE_URL` — switch by env var only             |
| Storage        | Cloudinary                              | Server-side signed uploads, transforms, CDN                  |
| Validation     | Zod (shared client + server)            | Same schema on both ends                                     |
| Background job | External cron (GitHub Actions / VPS cron) | Not Vercel Cron — keeps portability                        |

---

## 2. Request Flow

```text
Client Component (src/features/products/hooks.ts)
  └─ useQuery({ queryFn: () => productsApi.list() })
        ↓
  src/shared/api-client/products.ts          (typed fetch wrapper)
        ↓  HTTP GET /api/products
  app/api/products/route.ts                  (thin handler, runtime=nodejs)
        ↓  apiHandler(handler)
  src/server/lib/apiHandler.ts               (auth, validation, error mapping)
        ↓  ctx = { userId, shopId, role }
  src/server/services/productsService.ts     (business logic — framework-agnostic)
        ↓
  src/server/db/client.ts                    (Prisma singleton)
        ↓
  PostgreSQL (Neon now / self-hosted later)
```

**Key design:** প্রতিটি layer-এর একটি মাত্র responsibility। `services/` কখনো Next.js import করে না — port করলে শুধু route handlers change হবে।

---

## 3. Folder Layout

```text
src/server/
├── db/
│   └── client.ts             # Prisma singleton (HMR-safe)
├── auth/
│   ├── config.ts             # Auth.js options
│   ├── session.ts            # getServerSession() wrapper
│   └── rbac.ts               # requireRole(), hasPermission()
├── services/                 # one file per domain
│   ├── productsService.ts
│   ├── salesService.ts
│   ├── customersService.ts
│   ├── purchasesService.ts
│   ├── inventoryService.ts
│   ├── accountsService.ts
│   ├── suppliersService.ts
│   ├── expensesService.ts
│   ├── transfersService.ts
│   ├── notificationsService.ts
│   └── shiftsService.ts
└── lib/
    ├── apiHandler.ts         # Route Handler wrapper
    ├── errors.ts             # ServiceError + HTTP code mapping
    └── ctx.ts                # Ctx type + builder
```

প্রত্যেক server file-এ `import "server-only"` — client component accidentally import করলে build fail হবে। এটি guarantee দেয় DB credentials browser-এ leak করবে না।

---

## 4. Service Pattern

Services are **pure functions** that take a `ctx` and return data. They never read `request`, `cookies`, or `headers`.

```ts
// src/server/services/salesService.ts
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import type { SaleCreateInput } from "@/shared/validators/sale";

export const salesService = {
  async create(ctx: Ctx, input: SaleCreateInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Validate stock
      for (const item of input.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stock < item.qty) {
          throw new ServiceError("OUT_OF_STOCK", `${product?.name} stock insufficient`);
        }
      }
      // 2. Create sale with items + tenders
      const sale = await tx.sale.create({
        data: {
          shopId: ctx.shopId,
          userId: ctx.userId,
          channel: input.channel ?? "POS",
          total: input.total,
          items: { create: input.items },
          tenders: { create: input.tenders },
        },
        include: { items: true, tenders: true },
      });
      // 3. Decrement stock
      for (const item of input.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }
      return sale;
    });
  },

  list: (ctx: Ctx, filter?: { channel?: "POS" | "STOREFRONT" }) =>
    prisma.sale.findMany({
      where: { shopId: ctx.shopId, ...(filter?.channel && { channel: filter.channel }) },
      orderBy: { createdAt: "desc" },
      include: { items: true, customer: true },
    }),
};
```

**Key rules:**
- Every service method's first arg = `ctx`. Always scope queries by `ctx.shopId`.
- Multi-step writes go in `prisma.$transaction`.
- Throw `ServiceError` for known failures — `apiHandler` maps them to HTTP codes.
- Never `console.log` request bodies (PII risk).

---

## 5. `apiHandler` Wrapper

```ts
// src/server/lib/apiHandler.ts
export function apiHandler<T>(handler: Handler<T>) {
  return async (req: Request) => {
    try {
      const session = await auth();
      if (!session?.user) {
        return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      }
      const ctx: Ctx = { userId: session.user.id, shopId: session.user.shopId, role: session.user.role };
      const data = await handler(ctx, req);
      return Response.json(data);
    } catch (err) {
      if (err instanceof ServiceError)
        return Response.json({ error: err.code, message: err.message }, { status: err.status });
      if (err instanceof z.ZodError)
        return Response.json({ error: "VALIDATION", issues: err.issues }, { status: 422 });
      console.error("API error:", err);
      return Response.json({ error: "INTERNAL" }, { status: 500 });
    }
  };
}
```

For **public** storefront endpoints, there's a `publicApiHandler` variant (in `apiHandler.ts`) that skips auth but still scopes by `shopId`.

---

## 6. RBAC

```ts
const HIERARCHY: Record<Role, number> = {
  OWNER: 4, MANAGER: 3, CASHIER: 2, VIEWER: 1
};

export function requireRole(ctx: Ctx, min: Role) {
  if (HIERARCHY[ctx.role] < HIERARCHY[min])
    throw new ServiceError("FORBIDDEN", `Requires ${min} role`, 403);
}
```

**Note:** Currently no `SUPER_ADMIN` role exists. Planned for Phase 1 of multi-tenant SaaS.

---

## 7. API Contract

| Method | Path | Service | Role |
|--------|------|---------|------|
| GET | `/api/products` | productsService.list | CASHIER+ |
| POST | `/api/products` | productsService.create | MANAGER+ |
| PATCH | `/api/products/[id]` | productsService.update | MANAGER+ |
| DELETE | `/api/products/[id]` | productsService.delete | OWNER |
| GET | `/api/sales?channel=POS` | salesService.list | CASHIER+ |
| POST | `/api/sales` | salesService.create | CASHIER+ |
| POST | `/api/sales/[id]/void` | salesService.void | MANAGER+ |
| GET | `/api/inventory` | inventoryService.snapshot | CASHIER+ |
| POST | `/api/inventory/adjust` | inventoryService.adjust | MANAGER+ |
| POST | `/api/transfers` | transfersService.create | MANAGER+ |
| GET | `/api/customers` | customersService.list | CASHIER+ |
| POST | `/api/customers` | customersService.create | CASHIER+ |
| GET | `/api/suppliers` | suppliersService.list | MANAGER+ |
| POST | `/api/purchases` | purchasesService.create | MANAGER+ |
| GET | `/api/accounts` | accountsService.tree | MANAGER+ |
| POST | `/api/accounts` | accountsService.create | MANAGER+ |
| POST | `/api/accounts/transfer` | accountsService.transfer | MANAGER+ |
| GET | `/api/expenses` | expensesService.list | MANAGER+ |
| POST | `/api/expenses` | expensesService.create | CASHIER+ |
| POST | `/api/upload` | (Cloudinary signed upload) | CASHIER+ |
| GET | `/api/storefront/products` | productsService.publicList | public |
| POST | `/api/storefront/checkout` | salesService.createStorefrontOrder | public |

---

## 8. Vendor Portability

| Concern | Vercel-only? | Portable replacement |
|---------|-------------|---------------------|
| `next start` | No | Run on VPS via Docker |
| Route Handlers | No | Pure Web API — Node runtime |
| Auth.js | No | Works in any Node env |
| Prisma | No | Standard PG driver |
| Neon DB | No | Swap `DATABASE_URL` → self-host Postgres |
| Cloudinary | No | Direct API — works anywhere |
| Vercel Cron | **YES** ⚠️ | Use GitHub Actions / VPS `cron` → POST `/api/cron/x` with `CRON_SECRET` |

**Rule:** never import `@vercel/*` packages. Cron jobs must be triggered by external schedulers.

### Dockerfile for VPS

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm prisma generate && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

Add `output: "standalone"` in `next.config.mjs`.

---

## 9. Security Checklist

- [ ] `NEXTAUTH_SECRET` is 32+ random bytes
- [ ] All routes use `apiHandler` — no manual `req.json()` without Zod
- [ ] Every service query includes `where: { shopId: ctx.shopId }` (multi-tenant scoping)
- [ ] No `process.env.X` reads in client components
- [ ] Cloudinary uploads use **signed** uploads (server-issued signature)
- [ ] Cron endpoints check `req.headers.get("authorization") === \`Bearer ${process.env.CRON_SECRET}\``
- [ ] Database credentials never logged

---

## 10. Authorization Flows

### Admin (dashboard) access
```
Request → proxy.ts → /dashboard/* → (dashboard)/layout.tsx → auth()
  → if no session: redirect /login
  → if session: render AdminShell → feature component
```

### Storefront (public) access
```
Request → proxy.ts → /storefront/* → rewrite → (storefront) route group → no auth
```

### API access
```
Request → apiHandler → auth() → buildCtx()
  → service method → requireRole(ctx, minRole) → throw 403 if insufficient
```
