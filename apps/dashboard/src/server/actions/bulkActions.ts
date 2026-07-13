"use server";

import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ServiceError } from "@/server/lib/errors";
import { categoriesService } from "@/server/services/categoriesService";
import { 
  bulkCreateBrands, 
  bulkCreateProductNames, 
  bulkCreateModels, 
  bulkCreateSeries 
} from "@/server/services/catalogService";

async function getActionCtx() {
  const session = await auth();
  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "User not authenticated", 401);
  }
  return buildCtx(session.user as any);
}

export async function bulkImportCategoriesAction(data: { name: string, parentName?: string, isPublished?: boolean }[]) {
  try {
    const ctx = await getActionCtx();
    const result = await categoriesService.bulkCreate(ctx, data);
    return { success: true, count: result.count };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to import categories" };
  }
}

export async function bulkImportCatalogAction(entity: string, data: string[]) {
  try {
    const ctx = await getActionCtx();
    let result;
    
    switch (entity) {
      case "brands":
        result = await bulkCreateBrands(ctx, data);
        break;
      case "products":
        result = await bulkCreateProductNames(ctx, data);
        break;
      case "models":
        result = await bulkCreateModels(ctx, data);
        break;
      case "series":
        result = await bulkCreateSeries(ctx, data);
        break;
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
    
    return { success: true, count: result.count };
  } catch (error: any) {
    return { success: false, error: error.message || `Failed to import ${entity}` };
  }
}
