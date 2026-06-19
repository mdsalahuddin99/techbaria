/**
 * Structured JSON logger using Pino.
 *
 * Every API call gets a unique `requestId` for correlation across
 * logs, errors, and Sentry events.
 *
 * Usage:
 * ```ts
 * import { logger } from "@/lib/logger";
 * logger.info({ entity: "Product", action: "create" }, "Product created");
 * logger.error({ err, requestId }, "Failed to create product");
 * ```
 *
 * In production (Vercel), logs are JSON — pipe to Papertrail / Datadog / Axiom.
 * In development, they're human-readable via Pino-pretty (if installed).
 */
import pino from "pino";
import { AsyncLocalStorage } from "node:async_hooks";

// ─── requestId correlation ──────────────────────────────────────────────────

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Get the current requestId (set by apiHandler).
 * Returns "no-request" if called outside an HTTP request context.
 */
export function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? "no-request";
}

// ─── Logger ─────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development";

/**
 * Singleton Pino logger.
 *
 * - Development: human-readable with colorized output
 * - Production: JSON lines (piped to log drain)
 *
 * Automatically includes `requestId` and `pid` with every log.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),

  // In development, use pino-pretty for readability
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    },
  }),

  // Always mix in requestId
  mixin() {
    return { requestId: getRequestId() };
  },

  // Redact sensitive fields from logs
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "body.password",
      "body.token",
      "body.secret",
    ],
    censor: "[REDACTED]",
  },
});
