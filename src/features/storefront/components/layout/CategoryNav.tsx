"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMegaMenuTree } from "../../hooks/useStorefrontCategories";

export function CategoryNav() {
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

  if (!tree.length) {
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-[#E2E8F0] shadow-sm relative z-30 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ul className="flex flex-wrap items-center gap-1 py-1">
          {tree.map((cat) => (
            <li
              key={cat.category}
              className="relative shrink-0"
              onMouseEnter={() => {
                clearClose();
                setActiveCat(cat.category);
                setActiveSub(null);
              }}
              onMouseLeave={scheduleClose}
            >
              <Link
                href={`/shop/${encodeURIComponent(cat.category)}`}
                className={`block px-3 py-2 text-[13px] font-bold rounded-md transition-colors whitespace-nowrap
                  ${activeCat === cat.category
                    ? "text-[#16A34A] bg-[#F0FDF4]"
                    : "text-slate-700 hover:text-[#16A34A] hover:bg-[#F0FDF4]"}`}
              >
                {cat.category}
              </Link>

              {/* ── Level 2: Sub-categories ── */}
              {activeCat === cat.category && cat.subcategories.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-[#DBEAFE] rounded-md shadow-xl z-50 py-2 min-w-[220px]"
                  onMouseEnter={clearClose}
                  onMouseLeave={scheduleClose}
                >
                  {cat.subcategories.map((sub) => (
                    <div
                      key={sub.subcategory}
                      className="relative group/sub"
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
                          <ChevronRight className="h-4 w-4 shrink-0 ml-3 opacity-40 group-hover/sub:opacity-100" />
                        )}
                      </Link>

                      {/* ── Level 3: Brands ── */}
                      {activeSub === sub.subcategory && sub.brands.length > 0 && (
                        <div
                          className="absolute top-0 left-full bg-white border border-[#DBEAFE] rounded-md shadow-xl z-50 py-2 min-w-[180px]"
                          style={{ marginLeft: "4px" }}
                        >
                          {sub.brands.map((brand) => (
                            <Link
                              key={brand}
                              href={`/shop/${encodeURIComponent(cat.category)}?brand=${encodeURIComponent(brand)}`}
                              className="block px-4 py-2 text-sm text-slate-600 hover:bg-[#F0FDF4] hover:text-[#16A34A] transition-colors whitespace-nowrap"
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
