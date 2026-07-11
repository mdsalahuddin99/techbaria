/**
 * API client wrapper for Auth operations: profile & password management.
 */
import { apiFetch } from "./fetch";
import type { AuthUser } from "@/features/auth/types";

const BASE = "/api/auth";

export const authService = {
  /** Get current user profile */
  getProfile(): Promise<AuthUser> {
    return apiFetch<AuthUser>(`${BASE}/profile`);
  },

  /** Update current user profile */
  updateProfile(patch: Partial<Pick<AuthUser, "name" | "image">>): Promise<AuthUser> {
    return apiFetch<AuthUser>(`${BASE}/profile`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  /** Request password reset OTP */
  requestOtp(input: { email: string }): Promise<{ sent: boolean; message: string }> {
    return apiFetch(`${BASE}/otp`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Verify OTP */
  verifyOtp(input: { email: string; otp: string }): Promise<{ valid: boolean }> {
    return apiFetch(`${BASE}/otp/verify`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Reset password with OTP */
  resetPassword(input: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean }> {
    return apiFetch(`${BASE}/reset-password`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
