import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

export const requestOtpSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
  otp: z.string().trim().regex(/^[0-9]{6}$/, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RequestOtpFormValues = z.infer<typeof requestOtpSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
