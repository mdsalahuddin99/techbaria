"use client";

import { useStorefrontBrands } from "../../hooks/useStorefrontCategories";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Top Brands row — Light Sky Blue section with auto-scroll brand pills */
export function BrandsRow() {
  const brands = useStorefrontBrands();
  if (brands.length < 2) return null;

  return (
    <section style={{ background: "#DBEAFE" }} className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="sf-section-accent" />
            <div>
              <h2 className="sf-section-title">Top Brands</h2>
              <p className="text-sm mt-1" style={{ color: "#16A34A" }}>
                অথেনটিক ব্র্যান্ডের সেরা প্রোডাক্ট
              </p>
            </div>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold transition-all"
            style={{ color: "#15803D" }}
          >
            All Brands <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Brand pills */}
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {brands.map((b, i) => (
            <div
              key={b}
              className="group shrink-0 px-6 h-14 rounded-[16px] bg-card text-card-foreground flex items-center justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1"
              style={{
                border: "1.5px solid #BFDBFE",
                boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
                animationDelay: `${i * 0.05}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#16A34A";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#BFDBFE";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.06)";
              }}
            >
              <span className="font-bold text-sm sm:text-base tracking-wide text-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary transition-all duration-300">
                {b}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
