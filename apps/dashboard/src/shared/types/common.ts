/**
 * Cross-feature primitive types. Anything domain-specific belongs in
 * `src/features/<name>/types.ts` — not here.
 */

export type ID = string;
export type ISODate = string;
export type Money = number;

export interface BaseEntity {
  id: ID;
  createdAt?: ISODate;
  updatedAt?: ISODate;
  /** Reserved for future multi-tenant rows. Optional today. */
  tenantId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type AsyncStatus = "idle" | "loading" | "success" | "error";
