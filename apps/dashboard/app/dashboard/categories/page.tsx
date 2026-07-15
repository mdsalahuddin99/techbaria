import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  // Fetch initial data
  const categories = await categoriesService.listFlat(ctx);

  return (
    <CategoriesClient
      initialCategories={categories}
      filterOnlineOnly={false}
    />
  );
}
