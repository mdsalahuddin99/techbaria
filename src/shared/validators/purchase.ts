import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Name is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  cost: z.number().min(0).optional(),
  /** Frontend sends this field — alias for `cost` */
  costPrice: z.number({ required_error: "Cost is required" }).min(0).optional(),
  extraCost: z.number().min(0).default(0),
  salePrice: z.number().min(0).optional(),
  serials: z.array(z.string()).optional(),
  warrantyStartDate: z.string().optional(),
  warrantyMonths: z.number().min(1).optional(),
}).transform((item) => ({
  productId: item.productId,
  name: item.name,
  qty: item.qty,
  cost: item.cost ?? item.costPrice ?? 0,
  extraCost: item.extraCost,
  salePrice: item.salePrice,
  serials: item.serials,
  warrantyStartDate: item.warrantyStartDate,
  warrantyMonths: item.warrantyMonths,
}));

export const purchaseTenderSchema = z.object({
  type: z.string(),
  amount: z.number().min(0),
  accountId: z.string().optional(),
  ref: z.string().optional(),
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().optional(),
  invoiceNo: z.string().optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  /** Frontend sends this field — alias for `notes` */
  note: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  tenders: z.array(purchaseTenderSchema).optional(),
  /** Frontend sends these fields — mapped to tenders */
  amountPaid: z.number().min(0).optional(),
  paidFromAccountId: z.string().optional(),
  status: z.string().optional(),
  expectedDate: z.string().optional(),
  branchId: z.string().optional(),
  warehouseId: z.string().optional(),
}).transform((input) => {
  // Merge amountPaid into tenders if provided
  const tenders = input.tenders ?? [];
  if ((input.amountPaid ?? 0) > 0) {
    tenders.push({
      type: "CASH",
      amount: input.amountPaid!,
      accountId: input.paidFromAccountId,
    });
  }
  return {
    supplierId: input.supplierId,
    invoiceNo: input.invoiceNo,
    discount: input.discount,
    notes: input.note ?? input.notes,
    status: input.status,
    expectedDate: input.expectedDate,
    items: input.items,
    tenders: tenders.length > 0 ? tenders : undefined,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
  };
});
