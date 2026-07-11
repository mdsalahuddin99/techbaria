import { apiFetch } from "./fetch";
import type { WarrantyClaimCreateInput, WarrantyClaimUpdateInput } from "../validators/warrantyClaim";
import { lookupWarrantySaleAction } from "@/server/actions/warrantyClaims";

export interface WarrantyClaim {
  id: string;
  claimNo: string;
  type: "CUSTOMER_CLAIM" | "DEFECTIVE_STOCK";
  status: "RECEIVED_FROM_CUSTOMER" | "SENT_TO_SUPPLIER" | "RECEIVED_FROM_SUPPLIER" | "RESOLVED" | "REJECTED";
  
  productId: string;
  product?: { id: string; name: string; sku: string; images?: { url: string }[] };
  serialNumber?: string | null;
  
  customerId?: string | null;
  customer?: { id: string; name: string; phone?: string | null };
  saleId?: string | null;
  sale?: { id: string; invoiceNo: string; date: string };
  
  supplierId?: string | null;
  supplier?: { id: string; name: string };
  
  issueDescription?: string | null;
  supplierNotes?: string | null;
  resolutionNote?: string | null;

  customerCost: number;
  supplierCost: number;
  isCustomerPaid: boolean;

  receivedAt: string;
  sentToSupplierAt?: string | null;
  returnedAt?: string | null;
  resolvedAt?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export const warrantyClaimsService = {
  list: (): Promise<WarrantyClaim[]> => apiFetch("/api/warranty-claims"),
  getById: (id: string): Promise<WarrantyClaim> => apiFetch(`/api/warranty-claims/${id}`),
  create: (data: WarrantyClaimCreateInput): Promise<WarrantyClaim> => 
    apiFetch("/api/warranty-claims", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: WarrantyClaimUpdateInput): Promise<WarrantyClaim> => 
    apiFetch(`/api/warranty-claims/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string): Promise<void> => 
    apiFetch(`/api/warranty-claims/${id}`, { method: "DELETE" }),
  lookupSale: async (query: string): Promise<any> => {
    const res = await lookupWarrantySaleAction(query);
    if (!res.success) throw new Error(res.error);
    return res.data;
  },
};
