"use server";

import { prisma } from "@/server/db/client";
import { revalidatePath } from "next/cache";

export async function getSiteConfig(key: string) {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key },
    });
    return config?.value || null;
  } catch (error) {
    console.error("Error fetching site config:", error);
    return null;
  }
}

export async function updateSiteConfig(key: string, value: any) {
  try {
    await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    
    // Revalidate paths that might use these settings
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating site config:", error);
    return { success: false, error: error.message };
  }
}
