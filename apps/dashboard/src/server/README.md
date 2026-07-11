# `src/server/` — Backend code (Next.js target)

⚠️ **This folder is for the Next.js port.** In the current Lovable (Vite) project these files are documentation/skeleton only — actual data still flows through `src/services/*` + Zustand localStorage.

## Rule of thumb

> Anything in `src/server/` may **NEVER** be imported from client code.
> When you port to Next.js, add `import "server-only";` at the top of each file
> here. The Next.js bundler will then crash the build if a client component
> accidentally imports it.

## Layout

```text
server/
├── db/
│   └── client.ts          ← Prisma singleton (HMR-safe)
├── auth/
│   ├── config.ts          ← NextAuth options
│   ├── session.ts         ← getServerSession() wrapper
│   └── rbac.ts            ← requireRole(), hasPermission()
├── services/              ← business logic — one file per domain
│   ├── productsService.ts
│   ├── salesService.ts
│   ├── customersService.ts
│   └── ...
└── lib/
    ├── errors.ts          ← ServiceError + HTTP mapping
    └── apiHandler.ts      ← Route Handler wrapper
                            (validates body with Zod, injects session,
                             converts ServiceError → NextResponse)
```

## How a request flows (Next.js target)

```text
Client component (features/products/hooks.ts)
  → useQuery({ queryFn: () => api.products.list() })
       ↓
  shared/api-client/products.ts          (typed fetch wrapper)
       ↓ HTTP GET /api/products
  app/api/products/route.ts              (thin handler)
       ↓ wrap(apiHandler)
  server/services/productsService.ts     (auth check, business logic)
       ↓
  server/db/client.ts → Prisma → Neon
```

## Why services are framework-agnostic

Services take a `ctx` object (`{ shopId, userId, role }`) — they don't import
Next.js APIs directly. This means:

- Route Handlers wrap them: `apiHandler((ctx, body) => productsService.list(ctx, body))`
- Server Actions wrap them: `'use server'; export async function listProducts() { const ctx = await getCtx(); return productsService.list(ctx); }`
- If you ever migrate to Express, the services come along unchanged.

## Validation

All input validation lives in `src/shared/validators/*` (Zod). Both the
client form and the API Route Handler validate with the same schema. Server
re-validation is non-negotiable — never trust client.
