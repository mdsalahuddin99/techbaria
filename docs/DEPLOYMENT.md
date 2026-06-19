# Deployment Guide

This guide covers deploying POS 360 to various platforms.

---

## 🚀 Vercel (Recommended)

Vercel provides the simplest deployment experience for Next.js apps.

### 1. Prerequisites
- A Vercel account
- Git repository (GitHub, GitLab, or Bitbucket)
- PostgreSQL database (Neon recommended)
- Cloudinary account
- Upstash Redis (optional but recommended)

### 2. Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure environment variables in the Vercel dashboard:
   ```env
   DATABASE_URL="your-neon-pooled-url"
   DIRECT_URL="your-neon-direct-url"
   NEXTAUTH_URL="https://your-domain.com"
   NEXTAUTH_SECRET="your-secret-key"
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   CLOUDINARY_UPLOAD_PRESET="signed-preset"
   UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
   ```
4. Click "Deploy"

### 3. Database Migrations on Vercel

Add a `vercel.json` file to your project root:

```json
{
  "buildCommand": "prisma generate && next build",
  "outputDirectory": ".next"
}
```

Then, add a "Build & Development Settings" script in Vercel dashboard:
- Build Command: `npm run build`
- Install Command: `npm install`

For migrations, you can:
- Run `npx prisma migrate deploy` locally before deploying
- Or set up a Vercel cron job to run migrations (not recommended for production)

---

## 🐳 Docker

### 1. Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
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

### 2. Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/pos99
      - DIRECT_URL=postgresql://postgres:password@db:5432/pos99
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=your-secret-key
      - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
      - CLOUDINARY_API_KEY=your-api-key
      - CLOUDINARY_API_SECRET=your-api-secret
      - CLOUDINARY_UPLOAD_PRESET=signed-preset
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: pos99
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. Run with Docker Compose

```bash
docker-compose up -d --build
```

---

## 🖥️ Self-Hosted (VPS)

### 1. Prerequisites
- A VPS (Ubuntu 22.04 recommended)
- Node.js ≥ 20
- PostgreSQL ≥ 15
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt)

### 2. Setup Steps

1. SSH into your VPS
2. Install Node.js, npm, PostgreSQL, and Nginx
3. Clone your repository
4. Install dependencies: `npm ci`
5. Build the app: `npm run build`
6. Set up environment variables in `.env.local`
7. Run database migrations: `npx prisma migrate deploy`
8. Start the app with PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "pos99" -- start
   pm2 save
   pm2 startup
   ```
9. Configure Nginx as a reverse proxy
10. Set up SSL with Let's Encrypt

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL pooled connection string |
| `DIRECT_URL` | ✅ | PostgreSQL direct connection string (for migrations) |
| `NEXTAUTH_URL` | ✅ | Full URL of your app |
| `NEXTAUTH_SECRET` | ✅ | Secret key for Auth.js (generate with `openssl rand -base64 32`) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `CLOUDINARY_UPLOAD_PRESET` | ✅ | Cloudinary signed upload preset |
| `UPSTASH_REDIS_REST_URL` | ❌ | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | Upstash Redis REST token |
