export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/server/db/client";
import { otpRateLimiter } from "@/lib/rateLimiter";

// In production, use a real OTP service (e.g., Resend, Twilio).
// This is a development scaffold that stores OTP in VerificationToken.
import crypto from "crypto";

const requestOtpSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
});

/**
 * POST /api/auth/otp — request a password-reset OTP.
 * In dev mode, returns the OTP in the response body for convenience.
 */
export async function POST(req: Request) {
  try {
    await otpRateLimiter(req);

    const body = await req.json();
    const parsed = requestOtpSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 422 });
    }

    const { email } = parsed.data;

    // Check user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak whether the email exists — always return "sent"
      return Response.json({ sent: true, message: "If the email exists, an OTP has been sent." });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100_000, 999_999).toString();

    // Store as VerificationToken (expires in 15 min)
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token: otp,
        expires,
      },
    });

    // In dev: log to console. In production: send via email/SMS.
    console.log(`[OTP for ${email}]: ${otp} (expires ${expires.toISOString()})`);

    return Response.json({
      sent: true,
      message: "If the email exists, an OTP has been sent.",
      // Dev convenience — remove in production
      ...(process.env.NODE_ENV === "development" && { devOtp: otp }),
    });
  } catch (err) {
    console.error("[otp POST] error:", err);
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
