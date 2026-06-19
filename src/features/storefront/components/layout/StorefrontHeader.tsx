import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, User, Phone, MapPin, Heart, GitCompareArrows } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { useCartCount } from "../../store/useCartStore";
import { useWishlistCount } from "../../store/useWishlistStore";
import { useCompareCount } from "../../store/useCompareStore";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";
import { SmartSearch } from "../search/SmartSearch";

export function StorefrontHeader() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const wishCount = useWishlistCount();
  const cmpCount = useCompareCount();
  const categories = useStorefrontCategories();

  return (
    <>
      {/* Top utility bar */}
      <div className="hidden md:flex bg-[#070718] text-slate-400 text-[11px] py-1.5 px-6 justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <a href="tel:+8801700000000" className="inline-flex items-center gap-1.5 hover:text-indigo-300">
            <Phone className="h-3 w-3" /> +880 1700-000000
          </a>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Dhaka, Bangladesh
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/storefront/track" className="hover:text-indigo-300">Track order</Link>
          <span>·</span>
          <Link href="/storefront/account" className="hover:text-indigo-300">Account</Link>
          <span>·</span>
          <span>BDT ৳</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#020617]/90 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden text-slate-300 p-2 -ml-2" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#0d0d24] border-white/10 text-slate-100 w-[85vw] sm:w-80">
              <SheetHeader>
                <SheetTitle className="text-white">Browse</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                <Link href="/storefront/shop" className="block p-3 rounded-xl hover:bg-card/5 font-medium">All Products</Link>
                {categories.map((c) => (
                  <Link
                    key={c.value}
                    href={`/storefront/shop/${encodeURIComponent(c.value)}`}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-card/5"
                  >
                    <span className="flex items-center gap-3">
                      <c.icon className="h-5 w-5 text-indigo-300" />
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-400">{c.count}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-2">
                <Link href="/storefront/wishlist" className="p-3 rounded-xl bg-card/5 flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-rose-400" /> Wishlist
                </Link>
                <Link href="/storefront/compare" className="p-3 rounded-xl bg-card/5 flex items-center gap-2 text-sm">
                  <GitCompareArrows className="h-4 w-4 text-indigo-300" /> Compare
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/storefront" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-600 to-violet-700 grid place-items-center font-bold text-white shadow-lg shadow-indigo-600/40">
              A
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight hidden xs:inline sm:inline bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              AmarShop
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm text-slate-300 ml-2">
            <Link href="/storefront/shop" className={`hover:text-white transition ${pathname === "/storefront/shop" ? "text-white font-medium" : ""}`}>
              Shop
            </Link>
            {categories.slice(0, 3).map((c) => {
              const href = `/storefront/shop/${encodeURIComponent(c.value)}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={c.value}
                  href={href}
                  className={`hover:text-white transition ${isActive ? "text-white font-medium" : ""}`}
                >
                  {c.label}
                </Link>
              );
            })}
          </nav>

          <SmartSearch className="flex-1 max-w-md ml-auto md:ml-2" />

          <Link href="/storefront/wishlist" className="relative hidden sm:inline-flex p-2 text-slate-200 hover:text-rose-300 transition" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
            {wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] grid place-items-center font-semibold text-white">
                {wishCount}
              </span>
            )}
          </Link>

          <Link href="/storefront/compare" className="relative hidden sm:inline-flex p-2 text-slate-200 hover:text-indigo-300 transition" aria-label="Compare">
            <GitCompareArrows className="h-5 w-5" />
            {cmpCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-[10px] grid place-items-center font-semibold text-white">
                {cmpCount}
              </span>
            )}
          </Link>

          <Link href="/storefront/account" className="hidden sm:inline-flex p-2 text-slate-200 hover:text-white" aria-label="Account">
            <User className="h-5 w-5" />
          </Link>

          <Link href="/storefront/cart" className="relative p-2 text-slate-200 hover:text-white" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-[10px] grid place-items-center font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>
    </>
  );
}
