import { z } from "zod";

export const settingsSchema = z.object({
  shopName: z.string().trim().min(1, "Shop name is required").max(80),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().trim().min(1, "Address is required").max(255),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  email: z.string().trim().email("Invalid email").max(255),
  website: z.string().url().optional().or(z.literal("")),
  currencySymbol: z.string().trim().min(1).max(4),
  receiptFooter: z.string().trim().max(255),
  loyaltyEnabled: z.boolean(),
  loyaltyPointsPerCurrency: z.coerce.number().nonnegative(),
  loyaltyRedeemRate: z.coerce.number().nonnegative(),
  hapticFeedback: z.boolean().default(true),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
