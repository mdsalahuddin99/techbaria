import { z } from "zod";

export const accountTypeSchema = z.enum(["cash", "bank", "mobile_banking"]);

export const accountCreateSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: accountTypeSchema,
  openingBalance: z.number().min(0).optional(),
  parentId: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const accountUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: accountTypeSchema.optional(),
  parentId: z.string().nullable().optional(),
});

export const accountDepositSchema = z.object({
  accountId: z.string(),
  direction: z.enum(["in", "out"]),
  amount: z.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

export const accountTransferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional(),
});
