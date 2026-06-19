# Local Development Setup

এই গাইডটা project টি local এ চালানোর জন্য।

> Companion docs: `BACKEND.md` (architecture), `docs/DATABASE.md` (schema), `docs/technical-architecture-audit.md` (deep-dive audit).

---

## 1. Prerequisites

| Tool           | Version | Install                                                |
| -------------- | ------- | ------------------------------------------------------ |
| Node.js        | ≥ 20.x  | <https://nodejs.org> বা `nvm install 20`               |
| npm            | ≥ 10.x  | Included with Node.js                                  |
| Git            | any     | <https://git-scm.com>                                  |
| PostgreSQL     | ≥ 15    | Neon (cloud) recommended for dev — no local install    |
| Cloudinary acc | free    | <https://cloudinary.com>                               |
| Upstash Redis  | free    | <https://upstash.com> (optional but highly recommended)|

Optional: Docker (for running local Postgres).

---

## 2. Clone & install

```bash
git clone <repo-url>
cd pos99-main
npm install
```

---

## 3. Create cloud resources

### 3.1 Neon Postgres (free tier)

1. Go to <https://console.neon.tech> → New Project → Name `shopflow-dev`
2. Copy **Pooled connection** string → `DATABASE_URL`
3. Copy **Direct connection** string → `DIRECT_URL`

### 3.2 Cloudinary

1. Sign up → Dashboard → copy `Cloud Name`, `API Key`, `API Secret`
2. Create an upload preset: Settings → Upload → Add upload preset → **Signed** → save the preset name

### 3.3 Generate NextAuth secret

```bash
openssl rand -base64 32
```

---

## 4. Environment variables

Create `.env.local` in project root:

```env
# --- Database ---
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# --- Auth.js ---
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<output of openssl rand -base64 32>"

# --- Cloudinary ---
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="xxx"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"
CLOUDINARY_UPLOAD_PRESET="shopflow_signed"

# --- Redis Caching (optional but HIGHLY recommended) ---
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"

# --- App ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="<another openssl rand -base64 32>"   # for external cron triggers
```

---

## 5. Database setup

```bash
npm run db:migrate                     # applies migrations
npm run db:seed                        # loads demo shop + owner@demo.com / password123
npx prisma studio                      # optional: visual DB browser at :5555
```

---

## 6. Run the app

```bash
npm run dev
# open http://localhost:3000
```

Verify:

- [ ] `/login` → log in with `owner@demo.com` / `password123`
- [ ] `/dashboard/pos` → ring up a sale → check Reports
- [ ] `/storefront/shop` → public page loads
- [ ] `/storefront/p/<slug>` → product detail works
- [ ] Upload an image in Products → appears in Cloudinary dashboard

---

## 7. Common commands

```bash
npm run dev                           # next dev
npm run build                         # next build
npm start                             # next start (after build)

npx prisma migrate dev --name <x>     # create + apply migration
npm run db:migrate                    # apply pending migrations (prod)
npx prisma generate                   # regenerate types
npx prisma studio                     # GUI

npm run test                          # vitest
npm run lint                          # eslint
npx tsc --noEmit                      # typecheck
```

---

## 8. Local Postgres (instead of Neon)

```bash
docker run --name shopflow-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

Then set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopflow"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/shopflow"
```

Create the DB once: `docker exec -it shopflow-pg createdb -U postgres shopflow`.

---

## 9. Troubleshooting

| Symptom                                                  | Fix                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `Error: Can't reach database server`                     | Check `DATABASE_URL`; for Neon make sure `sslmode=require`         |
| `PrismaClientInitializationError` on Vercel deploy       | Add `"postinstall": "prisma generate"` to `package.json` scripts   |
| `[next-auth][error] NO_SECRET`                           | Set `NEXTAUTH_SECRET` in `.env.local`                              |
| Image upload 401                                         | Cloudinary preset must be **Signed**; sign request server-side     |
| Edge runtime errors (`PrismaClient is unable to be run`) | Add `export const runtime = "nodejs"` to the route handler         |
| `/api/auth/session` 404                                  | Ensure `app/api/auth/[...nextauth]/route.ts` has `runtime = "nodejs"` |
