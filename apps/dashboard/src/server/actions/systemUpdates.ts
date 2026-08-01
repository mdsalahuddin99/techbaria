"use server";

import { prisma as db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

export type SystemUpdateInput = {
  version: string;
  date: Date;
  features: string[];
  improvements: string[];
  fixes: string[];
};

export async function createSystemUpdate(data: SystemUpdateInput) {
  try {
    const update = await db.systemUpdate.create({
      data: {
        version: data.version,
        date: data.date,
        features: data.features,
        improvements: data.improvements,
        fixes: data.fixes,
      },
    });
    
    revalidatePath("/dashboard/updates");
    return { success: true, data: update };
  } catch (error) {
    console.error("Failed to create system update:", error);
    return { success: false, error: "Failed to create update" };
  }
}

export async function deleteSystemUpdate(id: string) {
  try {
    await db.systemUpdate.delete({
      where: { id },
    });
    
    revalidatePath("/dashboard/updates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete system update:", error);
    return { success: false, error: "Failed to delete update" };
  }
}
