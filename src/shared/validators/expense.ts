import { z } from "zod";

export const expenseCreateSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive"),
  accountId: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const expenseUpdateSchema = z.object({
  category: z.string().optional(),
  amount: z.number().positive().optional(),
  accountId: z.string().nullable().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});
