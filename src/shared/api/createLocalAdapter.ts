import { asyncify, ServiceError } from "@/shared/lib";
import type { ID } from "@/shared/types";
import type { ApiAdapter } from "./types";

/**
 * Handlers a feature provides to expose its in-memory store as an
 * adapter. Everything is sync here; the factory wraps each call in a
 * Promise so the public surface matches `ApiAdapter`.
 */
export interface LocalAdapterHandlers<T, TInput, TFilters> {
  /** Entity name used in error messages, e.g. "Customer". */
  entity: string;
  list: (filters?: TFilters) => T[];
  get: (id: ID) => T | null;
  create: (input: TInput) => T;
  update: (id: ID, patch: Partial<TInput>) => T | null;
  remove: (id: ID) => void;
}

interface BuildOptions {
  /** Resource key — typically the API path segment. */
  resource: string;
}

export function createLocalAdapter<T extends { id: string }, TInput = Omit<T, "id">, TFilters = unknown>(
  handlers: LocalAdapterHandlers<T, TInput, TFilters>,
  _options: BuildOptions
): ApiAdapter<T, TInput, TFilters> {
  void _options;
  const notFound = () =>
    new ServiceError(`${handlers.entity} not found`, "NOT_FOUND");

  return {
    list: (filters) => asyncify(handlers.list(filters)),
    get: (id) => asyncify(handlers.get(id)),
    create: (input) => {
      try {
        return asyncify(handlers.create(input));
      } catch (err) {
        return Promise.reject(
          err instanceof ServiceError
            ? err
            : new ServiceError(
                err instanceof Error ? err.message : "Create failed",
                "CREATE_FAILED"
              )
        );
      }
    },
    update: (id, patch) => {
      const next = handlers.update(id, patch);
      if (!next) return Promise.reject(notFound());
      return asyncify(next);
    },
    remove: (id) => {
      handlers.remove(id);
      return asyncify(undefined);
    },
  };
}
