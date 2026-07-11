import { z } from "zod";

export const warrantyClaimCreateSchema = z.object({
  type: z.enum(["CUSTOMER_CLAIM", "DEFECTIVE_STOCK"]),
  productId: z.string().min(1, "Product is required"),
  serialNumber: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  saleId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  issueDescription: z.string().optional().nullable(),
});

export const warrantyClaimUpdateSchema = z.object({
  status: z.enum([
    "RECEIVED_FROM_CUSTOMER",
    "SENT_TO_SUPPLIER",
    "RECEIVED_FROM_SUPPLIER",
    "RESOLVED",
    "REJECTED"
  ]).optional(),
  supplierNotes: z.string().optional().nullable(),
  resolutionNote: z.string().optional().nullable(),
  customerCost: z.number().min(0).optional(),
  supplierCost: z.number().min(0).optional(),
  isCustomerPaid: z.boolean().optional(),
});

export type WarrantyClaimCreateInput = z.infer<typeof warrantyClaimCreateSchema>;
export type WarrantyClaimUpdateInput = z.infer<typeof warrantyClaimUpdateSchema>;
