import type { ID } from "@/shared/types";

/**
 * Transport-agnostic CRUD contract. Every service either is an
 * `ApiAdapter<T, TInput, TFilters>` directly or composes one and
 * adds entity-specific methods (e.g. `salesService.void`).
 *
 * Today: local adapter backed by Zustand + tenantStorage.
 * Tomorrow: http adapter backed by Next.js `/api/*` routes.
 * Call sites never change.
 */
export interface ApiAdapter<T, TInput = Omit<T, "id">, TFilters = unknown> {
  list(filters?: TFilters): Promise<T[]>;
  get(id: ID): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: ID, patch: Partial<TInput>): Promise<T>;
  remove(id: ID): Promise<void>;
}

/** Driver currently powering the adapter layer. */
export type ApiDriver = "local" | "http";
