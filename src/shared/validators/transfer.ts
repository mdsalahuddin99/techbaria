import { z } from "zod";

export const transferItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
});

export const transferCreateSchema = z.object({
  fromBranchId: z.string(),
  toBranchId: z.string(),
  notes: z.string().optional(),
  items: z.array(transferItemSchema).min(1, "At least one item is required"),
});
