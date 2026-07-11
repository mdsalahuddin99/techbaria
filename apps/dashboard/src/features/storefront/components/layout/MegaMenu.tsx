"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMegaMenuTree } from "../../hooks/useStorefrontCategories";

export function MegaMenu() {
  const tree = useMegaMenuTree();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setActiveCat(null);
      setActiveSub(null);
    }, 150);
  }, []);

  const currentCat = tree.find((c) => c.category === activeCat) ?? null;
  const currentSub = currentCat?.subcategories.find((s) => s.subcategory === activeSub) ?? null;

  if (!tree.length) {
    return (
      <nav className="hidden lg:flex items-center gap-5 text-sm text-slate-600 ml-2">
        <Link href="/shop" className="hover:text-[#16A34A] font-medium transition-colors">
          Shop
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-600 ml-6">
      <Link href="/shop" className="hover:text-[#16A34A] font-semibold transition-colors">
        All Products
      </Link>

      {/* ── Categories button + all dropdown levels ── */}
      <div
        className="relative h-14 flex items-center"
        onMouseEnter={() => { clearClose(); if (!activeCat) setActiveCat(tree[0]?.category ?? null); }}
        onMouseLeave={scheduleClose}
      >
        <button className="flex items-center gap-1 hover:text-[#16A34A] font-semibold transition-colors">
          Categories <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {/* ── Level 1: Main categories list ── */}
        {activeCat !== null && (
          <div className="absolute top-full left-0 mt-0 bg-white border border-[#DBEAFE] rounded-md shadow-xl z-50 py-2 min-w-[200px]">
            {tree.map((cat) => (
              <div
                key={cat.category}
                className="relative"
                onMouseEnter={() => { clearClose(); setActiveCat(cat.category); setActiveSub(null); }}
              >
                <Link
                  href={`/shop/${encodeURIComponent(cat.category)}`}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap
                    ${activeCat === cat.category
                      ? "bg-[#F0FDF4] text-[#16A34A]"
                      : "text-slate-700 hover:bg-[#F0FDF4] hover:text-[#16A34A]"}`}
                >
                  {cat.category}
                  {cat.subcategories.length > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 ml-3 opacity-40" />
                  )}
                </Link>

                {/* ── Level 2: Sub-categories ── */}
                {activeCat === cat.category && cat.subcategories.length > 0 && (
                  <div
                    className="absolute top-0 left-full bg-white border border-[#DBEAFE] rounded-md shadow-xl z-50 py-2 min-w-[190px]"
                    style={{ marginLeft: "4px" }}
                  >
                    {cat.subcategories.map((sub) => (
                      <div
                        key={sub.subcategory}
                        className="relative"
                        onMouseEnter={() => { clearClose(); setActiveSub(sub.subcategory); }}
                      >
                        <Link
                          href={`/shop/${encodeURIComponent(cat.category)}?sub=${encodeURIComponent(sub.subcategory)}`}
                          className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors whitespace-nowrap
                            ${activeSub === sub.subcategory
                              ? "bg-[#F0FDF4] text-[#16A34A] font-medium"
                              : "text-slate-600 hover:bg-[#F0FDF4] hover:text-[#16A34A]"}`}
                        >
                          {sub.subcategory}
                          {sub.brands.length > 0 && (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 ml-3 opacity-40" />
                          )}
                        </Link>

                        {/* ── Level 3: Brands ── */}
                        {activeSub === sub.subcategory && sub.brands.length > 0 && (
                          <div
                            className="absolute top-0 left-full bg-white border border-[#DBEAFE] rounded-md shadow-xl z-50 py-2 min-w-[160px]"
                            style={{ marginLeft: "4px" }}
                          >
                            {sub.brands.map((brand) => (
                              <Link
                                key={brand}
                                href={`/shop/${encodeURIComponent(cat.category)}?brand=${encodeURIComponent(brand)}`}
                                className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-[#F0FDF4] hover:text-[#16A34A] transition-colors whitespace-nowrap"
                              >
                                {brand}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
