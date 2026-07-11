export const runtime = "nodejs";

import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/lib/password";
import { PERMISSIONS } from "@/server/auth/permissions";

export async function GET(req: Request) {
  const email = "Mamuncomputers2025@gmail.com";
  const password = "Mizan2026";
  const passwordHash = hashPassword(password);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: "ADMIN",
        permissions: [...PERMISSIONS],
        active: true,
      },
    });
    return new Response(JSON.stringify({ success: true, message: "User updated successfully. You can now log in." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    await prisma.user.create({
      data: {
        name: "Admin",
        email,
        passwordHash,
        role: "ADMIN",
        permissions: [...PERMISSIONS],
        active: true,
      },
    });
    return new Response(JSON.stringify({ success: true, message: "User created successfully. You can now log in." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
