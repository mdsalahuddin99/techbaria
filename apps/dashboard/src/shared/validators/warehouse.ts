import { z } from "zod";

export const warehouseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
