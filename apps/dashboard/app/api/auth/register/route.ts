export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/lib/password";
import { otpRateLimiter } from "@/lib/rateLimiter";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

/**
 * POST /api/auth/register
 *
 * Storefront customer registration.
 * Creates a user with CASHIER role under the default shop.
 * Does NOT create a new Shop — storefront users join the existing shop.
 */
export async function POST(req: Request) {
  try {
    // Rate limit: 3 requests per 60s per IP
    await otpRateLimiter(req);

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "VALIDATION",
          issues: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 422 },
      );
    }

    const { name, email, password } = parsed.data;

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "CONFLICT", message: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    logger.info({ userId: user.id, email: user.email }, "Storefront user registered");

    return Response.json(
      { success: true, user },
      { status: 201 },
    );
  } catch (err) {
    logger.error({ err }, "Registration failed");
    return Response.json(
      { error: "INTERNAL", message: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
