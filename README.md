# POS 360 — Multi-Tenant SaaS POS & Storefront

A complete, production-ready Point-of-Sale (POS) system with integrated online storefront, built for small to medium businesses.

## 🚀 Key Features

| Area | Features |
|------|----------|
| **POS** | Barcode scanning, thermal receipt printing, discount management, multi-tender payments, customer management |
| **Storefront** | Product catalog, search, cart, checkout, order tracking, wishlist, compare |
| **Inventory** | Stock adjustments, transfers, low-stock alerts, batch purchases, serial/IMEI tracking |
| **Finance** | Cash registers, account transfers, expenses, customer dues, supplier payments |
| **Reports** | Sales, inventory, profit & loss, valuation |
| **Multi-Tenant** | Shop-level isolation, branches, user roles (Owner/Manager/Cashier/Viewer) |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL (Neon recommended) |
| **Auth** | Auth.js v5 |
| **State Management** | TanStack Query (React Query) + Zustand |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Caching** | Upstash Redis |
| **Error Tracking** | Sentry |
| **Image Storage** | Cloudinary |

## 📂 Project Structure

```
pos99-main/
├── app/
│   ├── (auth)/              # Login, register, reset password
│   ├── (dashboard)/         # Admin/POS dashboard
│   ├── (marketing)/         # Landing page, pricing
│   ├── (storefront)/        # Public storefront
│   └── api/                 # API routes
├── docs/                    # Documentation
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
├── src/
│   ├── components/          # Reusable components
│   ├── config/              # Configuration
│   ├── features/            # Feature modules (pos, products, customers, etc.)
│   └── server/
│       ├── auth/            # Auth.js config + RBAC
│       ├── db/              # Prisma client singleton
│       ├── lib/             # Utilities
│       └── services/        # Business logic (framework-agnostic)
└── public/                  # Static assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 15
- Cloudinary account
- Upstash Redis (optional but recommended)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/pos99-main.git
cd pos99-main
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/pos99"
DIRECT_URL="postgresql://user:password@host:5432/pos99"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_UPLOAD_PRESET="signed-preset"

# Redis (optional but highly recommended)
UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

### 3. Database Setup
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Default credentials (from seed):
- Email: `owner@demo.com`
- Password: `password123`

## 📚 Documentation

- **[Local Setup Guide](docs/LOCAL_SETUP.md)** — Detailed installation instructions
- **[Database Schema](docs/DATABASE.md)** — Prisma schema & ERD
- **[Backend Architecture](BACKEND.md)** — API, services, RBAC
- **[API Reference](API.md)** — Endpoint documentation
- **[User Flow Guide](USER_FLOW.md)** — Step-by-step usage guide
- **[Storefront Docs](docs/STOREFRONT.md)** — Public storefront features
- **[Technical Audit](docs/technical-architecture-audit.md)** — Senior engineer audit

## 📊 Database ERD

![Database ERD](erd.md) (Mermaid.js diagram)

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 📦 Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions for Vercel, Docker, and self-hosted environments.

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a PR

## 📄 License

[MIT](LICENSE)

## 📞 Support

For questions or issues, please open an issue on GitHub.
