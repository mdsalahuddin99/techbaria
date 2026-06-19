/**
 * Sentry server configuration.
 * Captures server-side errors from API routes and server actions.
 *
 * Uses `SENTRY_DSN` environment variable (set on Vercel dashboard).
 * In development, Sentry is disabled.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? "";

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV ?? "development",
  enabled: process.env.NODE_ENV !== "development" && !!dsn,
  tracesSampleRate: 0.1,
  debug: process.env.NODE_ENV === "development",
});
