/**
 * Wraps a synchronous mock operation in a microtask-resolved Promise.
 *
 * This lets us keep the in-memory Zustand store today while exposing
 * service signatures that are already async — so swapping to a real
 * Next.js / Prisma API later is a 1-line change inside each service.
 */
export function asyncify<T>(value: T, delayMs = 0): Promise<T> {
  if (delayMs <= 0) return Promise.resolve(value);
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}

/** Async error helper for service-level rejections. */
export class ServiceError extends Error {
  constructor(message: string, public code: string = "SERVICE_ERROR") {
    super(message);
    this.name = "ServiceError";
  }
}
