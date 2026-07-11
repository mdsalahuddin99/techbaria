import { productsService } from "@/server/services/productsService";
import { ShopClient } from "@/features/storefront/components/product/ShopClient";

export const revalidate = 300; // 5 minutes ISR caching

type Props = {
  params: Promise<{ category?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StorefrontCatalog({ params, searchParams }: Props) {
  const { category: categoryArray } = await params;
  const searchParamsMap = await searchParams;
  
  const categoryName = categoryArray ? decodeURIComponent(categoryArray[0]) : undefined;
  
  const page = parseInt(searchParamsMap.page as string || "1", 10);
  const minPrice = searchParamsMap.minPrice ? parseInt(searchParamsMap.minPrice as string, 10) : undefined;
  const maxPrice = searchParamsMap.maxPrice ? parseInt(searchParamsMap.maxPrice as string, 10) : undefined;
  const inStockOnly = searchParamsMap.inStock === "true";
  const onSaleOnly = searchParamsMap.onSale === "true";
  const search = searchParamsMap.q as string | undefined;
  const sort = (searchParamsMap.sort as any) || "popular";
  
  let brands: string[] | undefined = undefined;
  if (searchParamsMap.brands) {
    brands = Array.isArray(searchParamsMap.brands) ? searchParamsMap.brands : searchParamsMap.brands.split(",");
  }

  const { items, total } = await productsService.publicStorefrontList({
    category: categoryName,
    search,
    page,
    limit: 12,
    minPrice,
    maxPrice,
    brands,
    inStockOnly,
    onSaleOnly,
    sort,
  });

  return <ShopClient initialProducts={items} totalCount={total} />;
}
