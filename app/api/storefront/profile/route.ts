import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/server/lib/password";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const userId = (session.user as any).id;
  
  try {
    const body = await req.json();
    const data = profileSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updateData: any = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.newPassword) {
      if (user.passwordHash) {
        if (!data.currentPassword) {
           return NextResponse.json({ error: "Current password is required" }, { status: 400 });
        }
        const isValid = verifyPassword(data.currentPassword, user.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }
      }
      updateData.passwordHash = hashPassword(data.newPassword);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
