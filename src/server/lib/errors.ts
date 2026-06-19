/**
 * ServiceError — thrown by services for known, handleable failures.
 * `apiHandler` catches these and maps them to the correct HTTP status.
 */
import "server-only";

export type ErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "VALIDATION"
  | "CONFLICT"
  | "INSUFFICIENT_PAYMENT"
  | "EMPTY_CART"
  | "OUT_OF_STOCK"
  | "INTERNAL";

export class ServiceError extends Error {
  constructor(
    public code: ErrorCode | string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * Map a ServiceError code to the most appropriate HTTP status.
 * Used by `apiHandler` when `ServiceError.status` is not set explicitly.
 */
export function httpStatusFor(code: string): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "UNAUTHENTICATED":
      return 401;
    case "VALIDATION":
      return 422;
    case "CONFLICT":
      return 409;
    case "EMPTY_CART":
    case "INSUFFICIENT_PAYMENT":
    case "OUT_OF_STOCK":
      return 400;
    default:
      return 500;
  }
}
