import { categoriesService } from "@/server/services/categoriesService";
import {
  listBrands,
  listProductNames,
  listModels,
  listSeries
} from "@/server/services/catalogService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
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
    listBrands(ctx, "all"),
    listProductNames(ctx, "all"),
    listModels(ctx, "all"),
    listSeries(ctx, "all")
  ]);

  return (
    <CategoriesClient
      initialCategories={categories}
      initialBrands={brands}
      initialProducts={products}
      initialModels={models}
      initialSeries={series}
    />
  );
}
