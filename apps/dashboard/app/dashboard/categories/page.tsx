import { categoriesService } from "@/server/services/categoriesService";
import {
  listBrands,
  listProductNames,
  listModels,
  listSeries,
  listColors,
  listStorage,
  listRam
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
    series,
    colors,
    storage,
    ram
  ] = await Promise.all([
    categoriesService.listFlat(ctx),
    listBrands(ctx),
    listProductNames(ctx),
    listModels(ctx),
    listSeries(ctx),
    listColors(ctx),
    listStorage(ctx),
    listRam(ctx)
  ]);

  return (
    <CategoriesClient
      initialCategories={categories}
      initialBrands={brands}
      initialProducts={products}
      initialModels={models}
      initialSeries={series}
      initialColors={colors}
      initialStorage={storage}
      initialRam={ram}
    />
  );
}
