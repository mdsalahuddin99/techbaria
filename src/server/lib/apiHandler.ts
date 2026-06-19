/**
 * Next.js Route Handler wrapper.
 *
 * Responsibilities:
 * 1. Authenticate via Auth.js → build `Ctx`
 * 2. Parse & validate request body with Zod (POST/PUT/PATCH)
 * 3. Delegate to service handler
 * 4. Map `ServiceError` / `ZodError` → JSON response with correct status
 *
 * Every API call gets a unique `requestId` for log correlation.
 * All logs are structured JSON via Pino.
 *
 * Usage in a route handler:
 * ```ts
 * // app/api/products/route.ts
 * import { apiHandler } from "@/server/lib/apiHandler";
 * import { productsService } from "@/server/services/productsService";
 *
 * export const GET = apiHandler(async (ctx) => {
 *   return productsService.list(ctx);
 * });
 *
 * export const POST = apiHandler(async (ctx, req) => {
 *   const body = await parseBody(req, createProductSchema);
 *   return productsService.create(ctx, body);
 * });
 * ```
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { rateLimiter } from "@/lib/rateLimiter";
import { csrfProtection } from "@/lib/csrf";
import { z } from "zod";
import { auth } from "@/server/auth/config";
import { NextResponse } from 'next/server';
import { buildCtx, type Ctx } from "./ctx";
import { authorize, type Role } from "./authorize";
import { ServiceError, httpStatusFor } from "./errors";
import { logger, requestContext } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

// ─── Types ──────────────────────────────────────────────────────────────────

type Handler<T> = (
  ctx: Ctx,
  req: Request,
  routeOpts?: { params: Record<string, string | string[]> },
) => Promise<T>;

// ─── Main wrapper ───────────────────────────────────────────────────────────

/**
 * Wraps a service call with authentication, error handling, and JSON
 * serialisation. Every protected Route Handler should use this.
 *
 * Usage:
 * ```ts
 * // Any authenticated user (default)
 * export const GET = apiHandler(async (ctx) => { ... });
 *
 * // Restrict to specific roles
 * export const POST = apiHandler(async (ctx) => { ... }, "products:create", ["MANAGER", "OWNER"]);
 * ```
 *
 * Next.js 16 passes `params` as a Promise — this wrapper resolves it
 * transparently so individual route handlers receive a plain object.
 */
export function apiHandler<T>(
  handler: Handler<T>,
  source?: string,
  allowedRoles?: Role[],
) {
  return async (
    req: Request,
    context?: { params: Promise<Record<string, string | string[]>> },
  ): Promise<Response> => {
    const requestId = randomUUID();
    const start = performance.now();

    // Run the entire request in the AsyncLocalStorage context so every
    // log call automatically picks up the requestId.
    return requestContext.run({ requestId }, async () => {
      try {
        // 0. Rate limit + CSRF checks (gracefully skip if unconfigured)
        await rateLimiter(req);
        await csrfProtection(req, new NextResponse());

        // 1. Authenticate — middleware has already checked the session cookie,
        //    so auth() here reads it from next/headers() reliably.
        const session = await auth();
        if (!session?.user) {
          logger.warn({ path: new URL(req.url).pathname }, "Unauthenticated request");
          return json({ error: "UNAUTHENTICATED" }, 401);
        }

        // 2. Build context from session
        const ctx = buildCtx(session.user as any);

        // 2b. Role-based access control (optional)
        if (allowedRoles && allowedRoles.length > 0) {
          authorize(ctx, allowedRoles);
        }

        // 3. Resolve params Promise (Next.js 16) then delegate to service
        const routeOpts = context?.params ? { params: await context.params } : undefined;
        const data = await handler(ctx, req, routeOpts);

        // 4. Log success
        const duration = Math.round(performance.now() - start);
        logger.info(
          { userId: ctx.userId, duration, path: new URL(req.url).pathname },
          "API success",
        );

        return json(data, 200);
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        const path = new URL(req.url).pathname;

        // Known service errors → mapped HTTP status
        if (err instanceof ServiceError) {
          logger.warn(
            { code: err.code, message: err.message, duration, path },
            "Service error",
          );
          return json(
            { error: err.code, message: err.message },
            err.status ?? httpStatusFor(err.code),
          );
        }
        // Zod validation errors → 422
        if (err instanceof z.ZodError) {
          logger.warn(
            { issues: err.issues.length, duration, path },
            "Validation error",
          );
          return json(
            { error: "VALIDATION", issues: err.issues },
            422,
          );
        }
        // Unknown errors → 500 (never expose internals)
        logger.error({ err, duration, path, source }, "Unhandled API error");
        Sentry.captureException(err, {
          tags: { path, source },
          extra: { duration, requestId },
        });
        console.error("❌ API Error:", err);
        return json({ error: "INTERNAL" }, 500);
      }
    });
  };
}

// ─── Public handler (no auth required) ──────────────────────────────────────

/**
 * For storefront endpoints that don't require authentication.
 * Still builds a partial Ctx scoped to the shop (from env or subdomain).
 *
 * Supports Next.js Route Handler pattern with `{ params }` as third argument.
 */
export function publicApiHandler<T>(
  handler: (shopId: string, req: Request, opts?: { params: Record<string, string | string[]> }) => Promise<T>,
) {
  return async (req: Request, context?: { params: Promise<Record<string, string | string[]>> }): Promise<Response> => {
    const requestId = randomUUID();
    const start = performance.now();

    return requestContext.run({ requestId }, async () => {
      try {
        // In multi-tenant setups, extract shopId from subdomain or env
        const shopId = process.env.DEFAULT_SHOP_ID ?? "";
        if (!shopId) {
          logger.error("DEFAULT_SHOP_ID not configured");
          return json({ error: "SHOP_NOT_CONFIGURED" }, 500);
        }

        const routeOpts = context?.params ? { params: await context.params } : undefined;
        const data = await handler(shopId, req, routeOpts);
        const duration = Math.round(performance.now() - start);
        logger.info({ duration, path: new URL(req.url).pathname }, "Public API success");
        return json(data, 200);
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        const path = new URL(req.url).pathname;

        if (err instanceof ServiceError) {
          logger.warn({ code: err.code, duration, path }, "Public service error");
          return json(
            { error: err.code, message: err.message },
            err.status ?? httpStatusFor(err.code),
          );
        }
        logger.error({ err, duration, path }, "Unhandled public API error");
        Sentry.captureException(err, {
          tags: { path },
          extra: { duration, requestId },
        });
        return json({ error: "INTERNAL" }, 500);
      }
    });
  };
}

// ─── Body parser helper ─────────────────────────────────────────────────────

/**
 * Parse and validate the request body against a Zod schema.
 * Throws `z.ZodError` on failure — caught by `apiHandler`.
 *
 * ```ts
 * const body = await parseBody(req, createProductSchema);
 * ```
 */
export async function parseBody(req: Request, schema: z.ZodTypeAny): Promise<any> {
  const raw = await req.json().catch(() => ({}));
  return schema.parse(raw);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}
