/**
 * Typed client using Next.js Server Actions.
 * Matches the same API surface as the old src/services/productsService.ts
 * so that existing feature hooks (importing from @/services) work unchanged.
 */
import type { Product } from "@/features/products/types";
import { 
  listProductsAction, 
  getProductByIdAction, 
  createProductAction, 
  updateProductAction, 
  deleteProductAction,
  getProductDistinctValuesAction
} from "@/server/actions/products";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const productsApi = {
  /** List products with optional filters and pagination */
  list(
    filter?: { search?: string; categoryId?: string; isPublished?: boolean; lowStock?: boolean },
    params?: { cursor?: string; limit?: number }
  ): Promise<PaginatedResponse<Product>> {
    return listProductsAction(filter, params) as unknown as Promise<PaginatedResponse<Product>>;
  },

  getById(id: string): Promise<Product | null> {
    return getProductByIdAction(id) as unknown as Promise<Product | null>;
  },

  create(data: any): Promise<Product> {
    return createProductAction(data) as unknown as Promise<Product>;
  },

  update(id: string, patch: Partial<Product>): Promise<Product | null> {
    return updateProductAction(id, patch) as unknown as Promise<Product | null>;
  },

  remove(id: string): Promise<void> {
    return deleteProductAction(id).then((res: any) => {
      if (res && res.error) throw new Error(res.error);
      return undefined;
    });
  },

  bulkUpdate(ids: string[], patch: Partial<Product>): Promise<void> {
    // Sequentially / in parallel invoke server action
    return Promise.all(ids.map((id) => this.update(id, patch))).then(() => undefined);
  },

  bulkRemove(ids: string[]): Promise<void> {
    return Promise.all(ids.map((id) => this.remove(id))).then(() => undefined);
  },

  getDistinctValues(field: string, parent?: string): Promise<string[]> {
    return getProductDistinctValuesAction(field, parent);
  },
};
