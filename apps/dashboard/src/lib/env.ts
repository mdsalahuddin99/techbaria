// src/lib/env.ts
/**
 * Helper to retrieve required secret environment variables.
 * Throws an error if the variable is missing at runtime.
 */
export function getEnvSecret(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
