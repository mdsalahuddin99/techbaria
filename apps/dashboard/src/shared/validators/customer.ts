import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  group: z.enum(["Regular", "Wholesale", "Technician"]).optional(),
  referencePerson: z.string().optional(),
  notes: z.string().optional(),
});

export const customerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  group: z.enum(["Regular", "Wholesale", "Technician"]).optional(),
  referencePerson: z.string().optional(),
  notes: z.string().optional(),
});

export const collectDueSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  accountId: z.string().min(1, "Account is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
