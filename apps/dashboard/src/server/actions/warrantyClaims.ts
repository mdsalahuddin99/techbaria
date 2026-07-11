"use server";

import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ServiceError } from "@/server/lib/errors";
import { warrantyClaimsService } from "@/server/services/warrantyClaimsService";

async function getActionCtx() {
  const session = await auth();
  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "User not authenticated", 401);
  }
  return buildCtx(session.user as any);
}

export async function lookupWarrantySaleAction(query: string) {
  try {
    const ctx = await getActionCtx();
    const result = await warrantyClaimsService.lookupSale(ctx, query);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to lookup sale" };
  }
}
