import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMegaMenuTree } from "../../hooks/useStorefrontCategories";

export function MegaMenu() {
  const tree = useMegaMenuTree();

  if (!tree.length) {
    return (
      <nav className="hidden lg:flex items-center gap-5 text-sm text-slate-600 ml-2">
        <Link href="/shop" className="hover:text-indigo-600 font-medium transition-colors">
          Shop
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-600 ml-6 relative">
      <Link href="/shop" className="hover:text-indigo-600 font-semibold transition-colors">
        All Products
      </Link>
      
      <div className="group relative">
        <button className="flex items-center gap-1 hover:text-indigo-600 font-semibold transition-colors h-14">
          Categories <ChevronDown className="h-4 w-4" />
        </button>
        
        {/* Mega Menu Dropdown */}
        <div className="absolute top-14 left-0 w-[800px] bg-white shadow-xl border border-slate-200 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 flex overflow-hidden">
          
          {/* Main Categories Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-slate-100 py-4 flex flex-col">
            {tree.map((cat) => (
              <div key={cat.category} className="group/cat relative w-full">
                <Link
                  href={`/shop/${encodeURIComponent(cat.category)}`}
                  className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-white hover:text-indigo-600 font-medium text-slate-700 transition-colors"
                >
                  {cat.category}
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover/cat:text-indigo-500" />
                </Link>
                
                {/* Subcategories & Brands Panel */}
                <div className="absolute top-0 left-full w-[544px] min-h-full bg-white opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible transition-all duration-200 p-6 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] flex gap-8 z-10 cursor-default">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.subcategory} className="flex-1 min-w-[140px]">
                      <Link
                        href={`/shop/${encodeURIComponent(cat.category)}?sub=${encodeURIComponent(sub.subcategory)}`}
                        className="block font-bold text-slate-900 mb-3 hover:text-indigo-600 pb-1 border-b border-slate-100"
                      >
                        {sub.subcategory}
                      </Link>
                      <ul className="space-y-2">
                        {sub.brands.length > 0 ? (
                          sub.brands.map((brand) => (
                            <li key={brand}>
                              <Link
                                href={`/shop/${encodeURIComponent(cat.category)}?sub=${encodeURIComponent(sub.subcategory)}&brand=${encodeURIComponent(brand)}`}
                                className="text-slate-500 hover:text-indigo-600 text-sm transition-colors block"
                              >
                                {brand}
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li>
                            <Link
                              href={`/shop/${encodeURIComponent(cat.category)}?sub=${encodeURIComponent(sub.subcategory)}`}
                              className="text-slate-500 hover:text-indigo-600 text-sm transition-colors block"
                            >
                              View All
                            </Link>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Empty space for the subcategory panel to show over */}
          <div className="flex-1 bg-white relative">
             <div className="absolute inset-0 grid place-items-center text-slate-300">
                <span className="text-sm font-medium">Hover over a category</span>
             </div>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
