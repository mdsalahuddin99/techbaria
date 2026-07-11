export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/lib/password";
import { otpRateLimiter } from "@/lib/rateLimiter";

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
  otp: z.string().trim().min(1, "OTP is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

/**
 * POST /api/auth/reset-password — reset password using OTP.
 */
export async function POST(req: Request) {
  try {
    await otpRateLimiter(req);

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 422 });
    }

    const { email, otp, newPassword } = parsed.data;

    // Find the OTP token
    const token = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: `reset:${email}`, token: otp } },
    });

    if (!token) {
      return Response.json({ error: "INVALID_OTP", message: "Invalid or expired OTP" }, { status: 400 });
    }

    if (token.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { identifier_token: { identifier: token.identifier, token: token.token } } });
      return Response.json({ error: "OTP_EXPIRED", message: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // Hash new password & update user
    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: token.identifier, token: token.token } },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[reset-password POST] error:", err);
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
