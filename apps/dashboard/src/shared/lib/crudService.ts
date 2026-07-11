import type { ID } from "@/shared/types";

/**
 * Standard CRUD contract every feature service should implement.
 * Keeps query keys, hooks, and call-sites consistent across the app.
 */
export interface CrudService<T, TInput = Omit<T, "id">, TFilters = unknown> {
  list(filters?: TFilters): Promise<T[]>;
  get(id: ID): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: ID, patch: Partial<TInput>): Promise<T>;
  remove(id: ID): Promise<void>;
}
