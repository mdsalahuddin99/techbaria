/**
 * Typed client using Next.js Server Actions.
 */
import type { Supplier } from "@/features/suppliers/types";
import { 
  listSuppliersAction, 
  getSupplierByIdAction, 
  createSupplierAction, 
  updateSupplierAction, 
  deleteSupplierAction,
  getSupplierProfileAction
} from "@/server/actions/suppliers";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const suppliersApi = {
  list(): Promise<PaginatedResponse<Supplier>> {
    return listSuppliersAction() as unknown as Promise<PaginatedResponse<Supplier>>;
  },

  getById(id: string): Promise<Supplier | null> {
    return getSupplierByIdAction(id) as unknown as Promise<Supplier | null>;
  },

  create(data: Omit<Supplier, "id" | "createdAt" | "payableBalance" | "totalPurchased">): Promise<Supplier> {
    return createSupplierAction(data as any) as unknown as Promise<Supplier>;
  },

  update(id: string, patch: Partial<Supplier>): Promise<Supplier | null> {
    return updateSupplierAction(id, patch as any) as unknown as Promise<Supplier | null>;
  },

  remove(id: string): Promise<void> {
    return deleteSupplierAction(id).then(() => undefined);
  },

  getProfile(id: string): Promise<any> {
    return getSupplierProfileAction(id);
  },
};
