"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { LayoutGrid, List, ChevronRight, ChevronLeft, Filter } from "lucide-react";
import { useStorefrontProducts, useSeo } from "@/features/storefront";
import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";
import { ProductListItem } from "@/features/storefront/components/product/ProductListItem";
import { ShopFilters, type ShopFilterState } from "@/features/storefront/components/filters/ShopFilters";
import { ActiveFilterChips } from "@/features/storefront/components/filters/ActiveFilterChips";
import { SortMenu } from "@/features/storefront/components/filters/SortMenu";
import { SubCategoryTags } from "@/features/storefront/components/product/SubCategoryTags";
import { Sheet, SheetContent, SheetTrigger } from "@/shared/ui/sheet";
import type { SortKey } from "@/features/storefront/types";
import type { StorefrontProduct } from "@/features/storefront/types";

const PAGE_SIZE = 12;

interface Props {
  initialProducts: StorefrontProduct[];
  totalCount: number;
}

export function ShopClient({ initialProducts, totalCount }: Props) {
  const params = useParams();
  const nextSearchParams = useSearchParams();
  // Fallback to window.location if useSearchParams is null (rare but possible in some setups)
  const searchParams = useMemo(() => {
    return nextSearchParams ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null);
  }, [nextSearchParams]);
  const categoryParam = params.category 
    ? (Array.isArray(params.category) ? params.category[0] : params.category) 
    : undefined;
  const decoded = categoryParam ? decodeURIComponent(categoryParam) : null;
  const activeSub = searchParams?.get("sub");
  const router = useRouter();

  // Remove useStorefrontProducts client fetching and filtering
  const products = initialProducts;

  // We can't easily calculate dynamic bounds from 24 items, so we should rely on server limits or hardcode max
  const bounds = { min: 0, max: 200000 };

  const initialState = (): ShopFilterState => ({
    category: decoded,
    brands: searchParams?.get("brands")?.split(",") || [],
    priceMin: searchParams?.has("minPrice") ? Number(searchParams.get("minPrice")) : bounds.min,
    priceMax: searchParams?.has("maxPrice") ? Number(searchParams.get("maxPrice")) : bounds.max,
    inStockOnly: searchParams?.get("inStock") === "true",
    onSaleOnly: searchParams?.get("onSale") === "true",
  });

  const [filters, setFilters] = useState<ShopFilterState>(initialState);
  const [sort, setSort] = useState<SortKey>((searchParams?.get("sort") as SortKey) || "popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const page = searchParams?.has("page") ? Number(searchParams.get("page")) : 1;
  const [isPending, startTransition] = useTransition();

  // Sync state to URL
  const updateUrl = (newFilters: ShopFilterState, newSort: SortKey, newPage: number) => {
    const sp = new URLSearchParams();
    if (newFilters.brands.length) sp.set("brands", newFilters.brands.join(","));
    if (newFilters.priceMin > bounds.min) sp.set("minPrice", newFilters.priceMin.toString());
    if (newFilters.priceMax < bounds.max) sp.set("maxPrice", newFilters.priceMax.toString());
    if (newFilters.inStockOnly) sp.set("inStock", "true");
    if (newFilters.onSaleOnly) sp.set("onSale", "true");
    if (newSort !== "popular") sp.set("sort", newSort);
    if (newPage > 1) sp.set("page", newPage.toString());
    
    // Preserve "sub" query param if activeSub is present
    if (activeSub) sp.set("sub", activeSub);

    const queryString = sp.toString();
    const url = `/storefront/shop${decoded ? `/${encodeURIComponent(decoded)}` : ""}${queryString ? `?${queryString}` : ""}`;
    startTransition(() => {
      router.push(url);
    });
  };

  const handleFilterChange = (v: ShopFilterState) => {
    setFilters(v);
    updateUrl(v, sort, 1);
  };

  const handleSortChange = (s: SortKey) => {
    setSort(s);
    updateUrl(filters, s, 1);
  };

  const handlePageChange = (p: number) => {
    updateUrl(filters, sort, p);
  };

  useEffect(() => {
    // Sync filters with URL when URL changes via Links (e.g. SubCategoryTags)
    const urlBrands = searchParams?.get("brands")?.split(",") || [];
    setFilters((f) => ({
      ...f,
      category: decoded,
      brands: urlBrands,
    }));
  }, [decoded, searchParams]);

  const visible = products;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const onCategoryNav = (cat: string | null) => {
    startTransition(() => {
      if (cat) router.push(`/storefront/shop/${encodeURIComponent(cat)}`);
      else router.push("/storefront/shop");
    });
  };

  const reset = () => {
    const initial = initialState();
    initial.brands = [];
    initial.priceMin = bounds.min;
    initial.priceMax = bounds.max;
    initial.inStockOnly = false;
    initial.onSaleOnly = false;
    setFilters(initial);
    setSort("popular");
    updateUrl(initial, "popular", 1);
  };

  useSeo({
    title: decoded ? `${decoded} — AmarShop` : "Shop all products — AmarShop",
    description: decoded
      ? `${decoded} category-এর অরিজিনাল প্রোডাক্ট পাইকারি ও খুচরা দামে।`
      : "AmarShop-এর সম্পূর্ণ ক্যাটালগ ব্রাউজ করুন।",
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4">
      {/* Breadcrumb — Electro style */}
      <nav className="text-xs text-slate-500 flex items-center gap-1.5 mb-4 bg-[#F0FDF4] border border-[#BFDBFE] px-3 py-2 rounded-sm overflow-x-auto whitespace-nowrap scrollbar-hide" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#16A34A] font-medium">Home</Link>
        <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
        <Link href="/shop" className="hover:text-[#16A34A] font-medium">Shop</Link>
        {decoded && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
            {activeSub ? (
              <Link href={`/shop/${encodeURIComponent(decoded)}`} className="hover:text-[#16A34A] font-medium text-[#475569]">{decoded}</Link>
            ) : (
              <span className="text-[#1E3A5F] font-semibold">{decoded}</span>
            )}
          </>
        )}
        {decoded && activeSub && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
            {filters.brands.length === 1 ? (
              <Link href={`/shop/${encodeURIComponent(decoded)}?sub=${encodeURIComponent(activeSub)}`} className="hover:text-[#16A34A] font-medium text-[#475569]">{activeSub}</Link>
            ) : (
              <span className="text-[#1E3A5F] font-semibold">{activeSub}</span>
            )}
          </>
        )}
        {decoded && activeSub && filters.brands.length === 1 && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
            <span className="text-[#1E3A5F] font-semibold">{filters.brands[0]}</span>
          </>
        )}
      </nav>

      {/* Category header — Electro style: compact with left yellow border accent */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="w-1 h-7 bg-[#16A34A] rounded-sm shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1E3A5F]">
              {filters.brands.length === 1 ? filters.brands[0] : (activeSub ?? decoded ?? "All Products")}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {products.length.toLocaleString("en-BD")} products
            </p>
          </div>
        </div>
      </div>

      <SubCategoryTags category={decoded} initialProducts={initialProducts} />

      {/* Layout: sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-sm border border-slate-200 bg-white p-4 max-h-[calc(100vh-7rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <ShopFilters
              value={filters}
              bounds={bounds}
              onChange={handleFilterChange}
              onReset={reset}
              onCategoryNav={onCategoryNav}
              initialProducts={initialProducts}
            />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Toolbar — Electro style */}
          <div className="flex items-center justify-between gap-2 mb-3 bg-slate-50 border border-slate-200 rounded-sm px-2.5 py-1.5">
            <div className="flex items-center gap-2 shrink-0">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="lg:hidden inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-[#16A34A] text-white text-sm font-bold hover:bg-[#15803D] transition">
                    <Filter className="h-4 w-4" /> Filters
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-white border-slate-200 text-slate-900 w-[85vw] sm:w-96 overflow-y-auto">
                  <div className="pt-4 px-2">
                    <ShopFilters
                      value={filters}
                      bounds={bounds}
                      onChange={handleFilterChange}
                      onReset={reset}
                      onCategoryNav={onCategoryNav}
                      initialProducts={initialProducts}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">{visible.length} items</span>
              <div className="inline-flex rounded-sm border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={`h-8 w-8 grid place-items-center transition ${
                    view === "grid" ? "bg-[#16A34A] text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`h-8 w-8 grid place-items-center border-l border-slate-200 transition ${
                    view === "list" ? "bg-[#16A34A] text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <SortMenu value={sort} onChange={handleSortChange} />
            </div>
          </div>


          {/* Active Filters */}
          <div className="mb-4">
            <ActiveFilterChips
              value={filters}
              bounds={bounds}
              onChange={handleFilterChange}
            />
          </div>

          {/* Results */}
          {view === "grid" ? (
            <ProductGrid
              products={visible}
              allProducts={visible}
              loading={false}
              emptyHint="এই filter-এ কোনো পণ্য নেই — পরিবর্তন করে দেখুন।"
            />
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">এই filter-এ কোনো পণ্য নেই।</div>
          ) : (
            <div className="space-y-3">
              {visible.map((p) => (
                <ProductListItem key={p.id} product={p} allProducts={visible} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="h-10 px-4 rounded-sm border border-slate-200 bg-white text-slate-500 font-medium hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <ChevronLeft className="h-4 w-4 inline-block mr-1" /> আগে
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
                ) {
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`h-10 w-10 flex items-center justify-center rounded-sm font-bold transition ${
                        page === p
                          ? "bg-[#16A34A] text-white shadow-md shadow-green-500/20"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                } else if (p === page - 2 || p === page + 2) {
                  return <span key={p} className="text-slate-400">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="h-10 px-4 rounded-sm border border-slate-200 bg-white text-slate-500 font-medium hover:bg-slate-50 disabled:opacity-50 transition"
              >
                পরে <ChevronRight className="h-4 w-4 inline-block ml-1" />
              </button>
            </div>
          )}

          {visible.length > 0 && (
            <div className="mt-6 text-center text-xs text-slate-500">
              Showing {Math.min(1 + (page - 1) * 12, totalCount)} to {Math.min(page * 12, totalCount)} of {totalCount} products
            </div>
          )}

          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}
