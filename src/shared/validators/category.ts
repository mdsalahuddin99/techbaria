import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (e.g. my-category)")
    .optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")).transform((v) => v || null),
  parentId: z.string().nullable().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case")
    .optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")).transform((v) => v || null),
  parentId: z.string().nullable().optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

