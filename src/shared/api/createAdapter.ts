import { getApiDriver } from "./apiConfig";
import {
  createLocalAdapter,
  type LocalAdapterHandlers,
} from "./createLocalAdapter";
import { createHttpAdapter } from "./createHttpAdapter";
import type { ApiAdapter } from "./types";

/**
 * Factory that picks the active driver. Services call this once and
 * never branch on the driver themselves.
 *
 *   const adapter = createAdapter<Customer, NewCustomer>({
 *     resource: "customers",
 *     local: { entity: "Customer", list, get, create, update, remove },
 *   });
 */
export interface CreateAdapterOptions<T, TInput, TFilters> {
  resource: string;
  local: LocalAdapterHandlers<T, TInput, TFilters>;
}

export function createAdapter<T extends { id: string }, TInput = Omit<T, "id">, TFilters = unknown>(
  options: CreateAdapterOptions<T, TInput, TFilters>
): ApiAdapter<T, TInput, TFilters> {
  return getApiDriver() === "http"
    ? createHttpAdapter<T, TInput, TFilters>({ resource: options.resource })
    : createLocalAdapter<T, TInput, TFilters>(options.local, { resource: options.resource });
}
