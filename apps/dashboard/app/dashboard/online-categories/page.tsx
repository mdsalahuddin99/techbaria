import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { CategoriesClient } from "../categories/CategoriesClient";

export default async function OnlineCategoriesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  // Fetch initial data
  const categories = await categoriesService.listFlat(ctx, { hasPublishedProducts: true });

  return (
    <div className="space-y-6">
      <CategoriesClient
        initialCategories={categories}
        filterOnlineOnly={true}
      />
    </div>
  );
}
