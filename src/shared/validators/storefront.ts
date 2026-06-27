import { z } from "zod";

export const heroSlideSchema = z.object({
  id: z.string(),
  headline: z.string().min(1, "Headline is required"),
  highlight: z.string().nullable().optional(),
  sub: z.string().nullable().optional(),
  cta1: z.string().min(1, "CTA 1 label is required"),
  cta1Link: z.string().min(1, "CTA 1 link is required"),
  cta2: z.string().nullable().optional(),
  cta2Link: z.string().nullable().optional(),
  imgUrl: z.string().min(1, "Image URL is required"),
  gradient: z.string().nullable().optional(),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const heroSlideCreateSchema = heroSlideSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const heroSlideUpdateSchema = heroSlideCreateSchema.partial();

export type HeroSlideType = z.infer<typeof heroSlideSchema>;
export type HeroSlideCreateInput = z.infer<typeof heroSlideCreateSchema>;
export type HeroSlideUpdateInput = z.infer<typeof heroSlideUpdateSchema>;
