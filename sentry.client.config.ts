/**
 * Sentry client configuration.
 * Captures runtime errors from the browser and React component trees.
 *
 * DSN is read from `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` env var.
 * In development, Sentry is disabled (no events sent).
 */
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "";

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV ?? "development",
  enabled: process.env.NODE_ENV !== "development" && !!dsn,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Capture 100% of errors during development for quick feedback
  debug: process.env.NODE_ENV === "development",

  // Only capture replays on error
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Ignore known noise
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "NetworkError when attempting to fetch resource",
    "AbortError",
  ],
});
