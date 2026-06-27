"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMegaMenuTree } from "../../hooks/useStorefrontCategories";

interface Props {
  category: string | null;
}

export function SubCategoryTags({ category }: Props) {
  const tree = useMegaMenuTree();
  const searchParams = useSearchParams();
  const activeSub = searchParams.get("sub");

  if (!category) return null;

  const currentCat = tree.find((c) => c.category === category);
  if (!currentCat) return null;

  // If a subcategory is selected, show its brands
  if (activeSub) {
    const currentSub = currentCat.subcategories.find((s) => s.subcategory === activeSub);
    if (!currentSub || currentSub.brands.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {currentSub.brands.map((brand) => (
          <Link
            key={brand}
            href={`/shop/${encodeURIComponent(category)}?sub=${encodeURIComponent(activeSub)}&brand=${encodeURIComponent(brand)}`}
            className="px-4 py-1.5 rounded-full border border-[#DBEAFE] bg-white hover:bg-[#EFF6FF] hover:border-[#BFDBFE] text-sm text-[#475569] hover:text-[#2563EB] transition-colors shadow-sm"
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
    <div className="flex flex-wrap gap-2 mb-6">
      {currentCat.subcategories.map((sub) => (
        <Link
          key={sub.subcategory}
          href={`/shop/${encodeURIComponent(category)}?sub=${encodeURIComponent(sub.subcategory)}`}
          className="px-4 py-1.5 rounded-full border border-[#DBEAFE] bg-white hover:bg-[#EFF6FF] hover:border-[#BFDBFE] text-sm text-[#475569] hover:text-[#2563EB] transition-colors shadow-sm"
        >
          {sub.subcategory}
        </Link>
      ))}
    </div>
  );
}
