import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  price: z.number().min(0),
  discount: z.number().min(0).optional(),
  warrantyMonths: z.number().int().min(0).optional(),
  serials: z.array(z.string()).optional(),
});

export const saleTenderSchema = z.object({
  type: z.string(),
  amount: z.number().min(0),
  accountId: z.string().optional().nullable(),
  ref: z.string().optional().nullable(),
});

export const saleCreateSchema = z.object({
  customerId: z.string().optional(),
  channel: z.enum(["POS", "STOREFRONT"]).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  salesPerson: z.string().optional(),
  date: z.string().optional(),
  destination: z.string().optional(),
  attention: z.string().optional(),
  vat: z.number().min(0).optional(),
  extraCharges: z.number().min(0).optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  tenders: z.array(saleTenderSchema).min(1, "At least one tender is required"),
});


export const refundItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  restock: z.boolean(),
});

export const refundCreateSchema = z.object({
  items: z.array(refundItemSchema).min(1, "At least one item is required"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

export const voidSaleSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});
