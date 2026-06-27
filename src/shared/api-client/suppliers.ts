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
  async list(filter?: any, pagination?: { cursor?: string }): Promise<PaginatedResponse<Supplier>> {
    const params = new URLSearchParams();
    if (pagination?.cursor) params.append("cursor", pagination.cursor);
    if (filter?.search) params.append("search", filter.search);
    if (filter?.sortKey) params.append("sortKey", filter.sortKey);
    if (filter?.sortDir) params.append("sortDir", filter.sortDir);

    const res = await fetch(`/api/suppliers?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    return res.json();
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

  async depositAdvance(data: { supplierId: string; amount: number; accountId: string; reference?: string; notes?: string; date?: string }) {
    const res = await fetch("/api/suppliers/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deposit", ...data }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async withdrawAdvance(data: { supplierId: string; amount: number; accountId: string; reference?: string; notes?: string; date?: string }) {
    const res = await fetch("/api/suppliers/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", ...data }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getLedger(id: string, page = 1) {
    const res = await fetch(`/api/suppliers/${id}/ledger?page=${page}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
