"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, ChevronRight, Filter } from "lucide-react";
import { useStorefrontProducts, useSeo } from "@/features/storefront";
import { useProducts } from "@/features/products/hooks";
import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";
import { ProductListItem } from "@/features/storefront/components/product/ProductListItem";
import { ShopFilters, type ShopFilterState } from "@/features/storefront/components/filters/ShopFilters";
import { ActiveFilterChips } from "@/features/storefront/components/filters/ActiveFilterChips";
import { SortMenu } from "@/features/storefront/components/filters/SortMenu";
import { Sheet, SheetContent, SheetTrigger } from "@/shared/ui/sheet";
import type { SortKey } from "@/features/storefront/types";

const PAGE_SIZE = 12;

export default function StorefrontCatalog() {
  const params = useParams();
  // optional catch-all category will be array or string
  const categoryParam = params.category 
    ? (Array.isArray(params.category) ? params.category[0] : params.category) 
    : undefined;
  const decoded = categoryParam ? decodeURIComponent(categoryParam) : null;
  const router = useRouter();
  const { data: allRaw } = useProducts();

  // Compute global price bounds across the visible catalog (active products only).
  const bounds = useMemo(() => {
    const prices = allRaw.filter((p) => p.active !== false).map((p) => p.price);
    if (prices.length === 0) return { min: 0, max: 100000 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [allRaw]);

  const initialState = (): ShopFilterState => ({
    category: decoded,
    brands: [],
    priceMin: bounds.min,
    priceMax: bounds.max,
    inStockOnly: false,
    onSaleOnly: false,
  });

  const [filters, setFilters] = useState<ShopFilterState>(initialState);
  const [sort, setSort] = useState<SortKey>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  // When category URL changes, sync state and reset pagination.
  useEffect(() => {
    setFilters((f) => ({ ...f, category: decoded }));
    setPage(1);
  }, [decoded]);

  // When bounds first resolve, expand price range to full bounds.
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      priceMin: f.priceMin === 0 && f.priceMax === 100000 ? bounds.min : f.priceMin,
      priceMax: f.priceMax === 100000 ? bounds.max : f.priceMax,
    }));
  }, [bounds.min, bounds.max]);

  const { products, all, isLoading } = useStorefrontProducts({
    category: filters.category,
    brands: filters.brands,
    minPrice: filters.priceMin,
    maxPrice: filters.priceMax,
    inStockOnly: filters.inStockOnly,
    onSaleOnly: filters.onSaleOnly,
    sort,
  });

  const visible = products.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < products.length;

  const onCategoryNav = (cat: string | null) => {
    if (cat) router.push(`/storefront/shop/${encodeURIComponent(cat)}`);
    else router.push("/storefront/shop");
  };

  const reset = () => {
    setFilters(initialState());
    setSort("popular");
    setPage(1);
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
      <nav className="text-xs text-slate-500 flex items-center gap-1.5 mb-4 bg-slate-50 border border-slate-200 px-3 py-2 rounded-md" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-yellow-600 font-medium">Home</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <Link href="/shop" className="hover:text-yellow-600 font-medium">Shop</Link>
        {decoded && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-slate-800 font-semibold">{decoded}</span>
          </>
        )}
      </nav>

      {/* Category header — Electro style: compact with left yellow border accent */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="w-1 h-7 bg-yellow-400 rounded-full shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {decoded ?? "All Products"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {products.length.toLocaleString("en-BD")} products
            </p>
          </div>
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-slate-200 bg-white p-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <ShopFilters
              value={filters}
              bounds={bounds}
              onChange={(v) => {
                setFilters(v);
                setPage(1);
              }}
              onReset={reset}
              onCategoryNav={onCategoryNav}
            />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Toolbar — Electro style */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="lg:hidden inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-yellow-400 text-slate-900 text-sm font-bold hover:bg-yellow-500 transition">
                    <Filter className="h-4 w-4" /> Filters
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-white border-slate-200 text-slate-900 w-[85vw] sm:w-96 overflow-y-auto">
                  <div className="pt-4 px-2">
                    <ShopFilters
                      value={filters}
                      bounds={bounds}
                      onChange={(v) => {
                        setFilters(v);
                        setPage(1);
                      }}
                      onReset={reset}
                      onCategoryNav={onCategoryNav}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex-1 min-w-0">
                <ActiveFilterChips
                  value={filters}
                  bounds={bounds}
                  onChange={(v) => {
                    setFilters(v);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500 hidden sm:inline">{visible.length} items</span>
              <div className="inline-flex rounded-md border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={`h-8 w-8 grid place-items-center transition ${
                    view === "grid" ? "bg-yellow-400 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`h-8 w-8 grid place-items-center border-l border-slate-200 transition ${
                    view === "list" ? "bg-yellow-400 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>

          {/* Results */}
          {view === "grid" ? (
            <ProductGrid
              products={visible}
              allProducts={all}
              loading={isLoading}
              emptyHint="এই filter-এ কোনো পণ্য নেই — পরিবর্তন করে দেখুন।"
            />
          ) : visible.length === 0 && !isLoading ? (
            <div className="text-center py-16 text-slate-400 text-sm">এই filter-এ কোনো পণ্য নেই।</div>
          ) : (
            <div className="space-y-3">
              {visible.map((p) => (
                <ProductListItem key={p.id} product={p} allProducts={all} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="h-11 px-8 rounded-md bg-yellow-400 text-slate-900 text-sm font-extrabold hover:bg-yellow-500 transition shadow-sm"
              >
                Load more ({products.length - visible.length} বাকি)
              </button>
            </div>
          )}

          {!hasMore && visible.length > 0 && (
            <div className="mt-8 text-center text-xs text-slate-500">
              সব {products.length} টি পণ্য দেখানো হয়েছে
            </div>
          )}

          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}
