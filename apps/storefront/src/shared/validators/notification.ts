import { z } from "zod";

export const notificationCreateSchema = z.object({
  type: z.string(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  link: z.string().optional(),
});

export const notificationUpdateSchema = z.object({
  read: z.boolean().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
});
