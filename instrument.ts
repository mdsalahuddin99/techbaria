/**
 * Sentry server instrumentation.
 * Automatically wraps all server API routes and server actions
 * with Sentry error tracking.
 *
 * This file is detected by `@sentry/nextjs` and loaded on the server.
 */
import * as Sentry from "@sentry/nextjs";

export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN ?? "",
    environment: process.env.NODE_ENV ?? "development",
    enabled: process.env.NODE_ENV !== "development" && !!process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
