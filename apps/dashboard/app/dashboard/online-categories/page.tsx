import { categoriesService } from "@/server/services/categoriesService";
import {
  listBrands,
  listProductNames,
  listModels,
  listSeries
} from "@/server/services/catalogService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { CategoriesClient } from "../categories/CategoriesClient";

export default async function OnlineCategoriesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  // Fetch initial data concurrently
  const [
    categories,
    brands,
    products,
    models,
    series
  ] = await Promise.all([
    categoriesService.listFlat(ctx),
    listBrands(ctx),
    listProductNames(ctx),
    listModels(ctx),
    listSeries(ctx)
  ]);

  // Pre-filter data for online
  const publishedCategories = categories.filter(c => c.isPublished);
  const publishedBrands = brands.filter(b => b.isPublished);
  const publishedProducts = products.filter(p => p.isPublished);
  const publishedModels = models.filter(m => m.isPublished);
  const publishedSeries = series.filter(s => s.isPublished);

  return (
    <CategoriesClient
      initialCategories={publishedCategories}
      initialBrands={publishedBrands}
      initialProducts={publishedProducts}
      initialModels={publishedModels}
      initialSeries={publishedSeries}
      filterOnlineOnly={true}
    />
  );
}
