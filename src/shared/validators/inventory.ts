import { z } from "zod";

export const adjustmentSchema = z.object({
  productId: z.string(),
  branchId: z.string().optional(),
  qtyDelta: z.number().refine((n) => n !== 0, "Quantity delta must be non-zero"),
  reason: z.enum(["DAMAGE", "LOSS", "THEFT", "CORRECTION", "RECEIVED", "OTHER"]),
  notes: z.string().optional(),
});
