/**
 * Sentry edge configuration.
 * Captures errors from middleware.ts and edge runtime routes.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? "";

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV ?? "development",
  enabled: process.env.NODE_ENV !== "development" && !!dsn,
  tracesSampleRate: 0.1,
});
