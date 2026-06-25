import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";

export function CategoryRail() {
  const categories = useStorefrontCategories();
  if (!categories.length) return null;

  return (
    <section className="sf-section-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="sf-section-accent" />
            <div>
              <h2 className="sf-section-title">Shop by Category</h2>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                আপনার পছন্দের ক্যাটাগরি বেছে নিন
              </p>
            </div>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold transition-all duration-200 hover:-translate-x-0.5"
            style={{ color: "#2563EB" }}
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {categories.slice(0, 8).map((c, i) => (
            <Link
              key={c.value}
              href={`/shop/${encodeURIComponent(c.value)}`}
              className="group flex flex-col items-center gap-3 p-3 sm:p-4 rounded-[20px] bg-white transition-all duration-300 hover:-translate-y-2 sf-animate-slide-up"
              style={{
                boxShadow: "0 4px 16px rgba(37,99,235,0.06)",
                animationDelay: `${i * 0.07}s`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 16px 40px rgba(37,99,235,0.16)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(37,99,235,0.06)")
              }
            >
              {/* Icon area */}
              <div
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: "linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)",
                }}
              >
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
                  }}
                />
                <c.icon
                  className="h-7 w-7 sm:h-8 sm:h-8 relative z-10 transition-colors duration-300"
                  style={{ color: "#2563EB" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as SVGElement).style.color = "#ffffff")
                  }
                />
              </div>

              {/* Label */}
              <div className="text-center">
                <div
                  className="text-[11px] sm:text-xs font-bold leading-tight transition-colors duration-200 group-hover:text-[#2563EB]"
                  style={{ color: "#1E3A5F" }}
                >
                  {c.label}
                </div>
                <div
                  className="text-[9px] sm:text-[10px] mt-0.5"
                  style={{ color: "#94A3B8" }}
                >
                  {c.count} items
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile "View All" */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-sm font-bold"
            style={{ color: "#2563EB" }}
          >
            View All Categories <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
