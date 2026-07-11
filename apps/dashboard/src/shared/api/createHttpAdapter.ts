import { ServiceError } from "@/shared/lib";
import type { ID } from "@/shared/types";
import { API_BASE_URL } from "./apiConfig";
import type { ApiAdapter } from "./types";

export interface HttpAdapterOptions {
  /** Path segment, e.g. "customers". */
  resource: string;
  /** Override base URL per-service if needed. */
  baseUrl?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      if (body?.code) code = body.code;
      if (body?.message) message = body.message;
    } catch {
      /* ignore body parse errors */
    }
    throw new ServiceError(message, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function createHttpAdapter<T, TInput = Omit<T, "id">, TFilters = unknown>(
  { resource, baseUrl = API_BASE_URL }: HttpAdapterOptions
): ApiAdapter<T, TInput, TFilters> {
  const root = `${baseUrl}/api/${resource}`;

  const toQuery = (filters?: TFilters) => {
    if (!filters || typeof filters !== "object") return "";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return {
    list: (filters) => request<T[]>(`${root}${toQuery(filters)}`),
    get: (id: ID) => request<T | null>(`${root}/${id}`),
    create: (input) =>
      request<T>(root, { method: "POST", body: JSON.stringify(input) }),
    update: (id: ID, patch) =>
      request<T>(`${root}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    remove: (id: ID) =>
      request<void>(`${root}/${id}`, { method: "DELETE" }),
  };
}
