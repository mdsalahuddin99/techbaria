import { z } from "zod";

export const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: z.enum([
    "Rent",
    "Salary",
    "Utilities",
    "Transport",
    "Marketing",
    "Maintenance",
    "Other",
  ]),
  amount: z.coerce.number().positive("Amount must be > 0"),
  description: z.string().trim().min(1, "Description is required").max(255),
  accountId: z.string().min(1, "Account is required"),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
