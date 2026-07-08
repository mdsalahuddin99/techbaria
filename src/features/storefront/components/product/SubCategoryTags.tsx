"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMegaMenuTree } from "../../hooks/useStorefrontCategories";
import type { StorefrontProduct } from "../../types";

interface Props {
  category: string | null;
  initialProducts?: StorefrontProduct[];
}

export function SubCategoryTags({ category }: Props) {
  const [mounted, setMounted] = useState(false);
  const tree = useMegaMenuTree();
  const searchParams = useSearchParams();
  const activeSub = searchParams.get("sub");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !category) return null;

  const currentCat = tree.find((c) => c.category === category);
  if (!currentCat) return null;

  // If a subcategory is selected, show its brands
  if (activeSub) {

    const currentSub = currentCat.subcategories.find((s) => s.subcategory === activeSub);
    if (!currentSub || currentSub.brands.length === 0) return null;

    // If a brand is already selected, hide the brand tags
    const selectedBrands = searchParams.get("brands");
    if (selectedBrands) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mb-4">
        {currentSub.brands.map((brand) => (
          <Link
            key={brand}
            href={`/shop/${encodeURIComponent(category)}?sub=${encodeURIComponent(activeSub)}&brands=${encodeURIComponent(brand)}`}
            className="px-3 py-1 rounded-full border border-[#DBEAFE] bg-white hover:bg-[#F0FDF4] hover:border-[#BFDBFE] text-[13px] font-medium text-[#475569] hover:text-[#16A34A] transition-colors shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)]"
          >
            {brand}
          </Link>
        ))}
      </div>
    );
  }

  // If no subcategory is selected, show subcategories
  if (currentCat.subcategories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {currentCat.subcategories.map((sub) => (
        <Link
          key={sub.subcategory}
          href={`/shop/${encodeURIComponent(category)}?sub=${encodeURIComponent(sub.subcategory)}`}
          className="px-3 py-1 rounded-full border border-[#DBEAFE] bg-white hover:bg-[#F0FDF4] hover:border-[#BFDBFE] text-[13px] font-medium text-[#475569] hover:text-[#16A34A] transition-colors shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)]"
        >
          {sub.subcategory}
        </Link>
      ))}
    </div>
  );
}
