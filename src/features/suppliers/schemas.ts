import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  contactPerson: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
