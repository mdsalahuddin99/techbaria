import { z } from "zod";

export const auditCreateSchema = z.object({
  branchId: z.string().nullable(),
  categoryFilter: z.string().nullable().optional(),
  note: z.string().optional(),
});

export const auditSetCountSchema = z.object({
  productId: z.string(),
  countedQty: z.number().nullable(),
  note: z.string().optional(),
});
