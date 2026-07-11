import type { ID } from "@/shared/types";

/**
 * Application-level roles.
 * Matches Prisma `Role` enum from `prisma/schema.prisma`.
 */
export type UserRole = "ADMIN" | "CASHIER" | "USER";

export const USER_ROLES: readonly UserRole[] = [
  "ADMIN",
  "CASHIER",
  "USER",
] as const;

export interface AuthUser {
  id: ID;
  email: string;
  name: string;
  image?: string | null;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  expires?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RequestOtpInput {
  email: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}
