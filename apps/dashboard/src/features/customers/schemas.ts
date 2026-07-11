import { z } from "zod";

const phoneRegex = /^[0-9+\-\s()]{6,20}$/;

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter a valid phone number")
    .or(z.literal("—")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  group: z.enum(["Regular", "Wholesale", "Technician"]),
  referencePerson: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});


export type CustomerFormValues = z.infer<typeof customerSchema>;
