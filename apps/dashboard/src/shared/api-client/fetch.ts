/**
 * Centralized fetch wrapper with structured error parsing.
 *
 * Every api-client file uses this instead of rolling its own `request<T>()`.
 * Server errors (`ServiceError`) are preserved as typed `ApiError` instances
 * so callers can inspect `.code` (e.g. `"NOT_FOUND"`, `"FORBIDDEN"`).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  error: string;
  message?: string;
  issues?: unknown[];
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly issues?: unknown[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch ─────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  // 204 No Content → return void
  if (res.status === 204) return undefined as unknown as T;

  const body = await res.json().catch<ApiErrorBody>(() => ({
    error: "INTERNAL",
    message: `HTTP ${res.status} — unable to parse response`,
  }));

  if (!res.ok) {
    throw new ApiError(
      body.error ?? "INTERNAL",
      body.message ?? body.error ?? `HTTP ${res.status}`,
      res.status,
      body.issues,
    );
  }

  return body as T;
}
