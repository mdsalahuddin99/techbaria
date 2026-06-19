"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, SlidersHorizontal, ChevronRight, Filter, Sparkles } from "lucide-react";
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-400 flex items-center gap-1 mb-3" aria-label="Breadcrumb">
        <Link href="/storefront" className="hover:text-indigo-300">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/storefront/shop" className="hover:text-indigo-300">Shop</Link>
        {decoded && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-200">{decoded}</span>
          </>
        )}
      </nav>

      {/* Hero band */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/40 via-[#0b0b22] to-violet-900/20 p-5 sm:p-7 mb-6">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(50% 70% at 80% 20%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(40% 60% at 20% 100%, rgba(168,85,247,0.25), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-card/10 border border-white/15 text-indigo-200 mb-2">
              <Sparkles className="h-3 w-3" /> Curated catalog
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {decoded ?? "All Products"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {products.length.toLocaleString("en-BD")} products · ৳{bounds.min.toLocaleString("en-BD")} – ৳{bounds.max.toLocaleString("en-BD")}
            </p>
          </div>
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-card/[0.03] backdrop-blur-sm p-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
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
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Sheet>
              <SheetTrigger asChild>
                <button className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-card/5 border border-white/10 text-sm text-slate-200 hover:border-indigo-400/40">
                  <Filter className="h-4 w-4" /> Filters
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#0b0b22] border-white/10 text-slate-100 w-[85vw] sm:w-96 overflow-y-auto">
                <div className="pt-4">
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

            <div className="hidden sm:inline-flex rounded-xl bg-card/5 border border-white/10 p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`h-8 w-8 rounded-lg grid place-items-center transition ${
                  view === "grid" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`h-8 w-8 rounded-lg grid place-items-center transition ${
                  view === "list" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-slate-400 hidden sm:block" />
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
                className="h-11 px-6 rounded-full bg-card/5 border border-white/10 text-sm font-semibold text-slate-200 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition"
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
