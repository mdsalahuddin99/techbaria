import type { ApiDriver } from "./types";

/**
 * Single switch that decides which adapter implementation services
 * compose. In Next.js we read from `NEXT_PUBLIC_*` env vars instead of
 * Vite's `import.meta.env`.
 */
const ENV_DRIVER =
  (process.env.NEXT_PUBLIC_API_DRIVER as ApiDriver | undefined) ?? "http";

let currentDriver: ApiDriver = ENV_DRIVER;

export function getApiDriver(): ApiDriver {
  return currentDriver;
}

export function setApiDriver(driver: ApiDriver): void {
  currentDriver = driver;
}

/**
 * Base URL for the http driver. In Next.js this is usually empty
 * (same-origin `/api/...`); for a separate API host, set
 * `NEXT_PUBLIC_API_BASE_URL`.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
