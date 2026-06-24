import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, User, Phone, MapPin, Heart, GitCompareArrows } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { useCartCount } from "../../store/useCartStore";
import { useWishlistCount } from "../../store/useWishlistStore";
import { useCompareCount } from "../../store/useCompareStore";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";
import { SmartSearch } from "../search/SmartSearch";
import { MegaMenu } from "./MegaMenu";

export function StorefrontHeader() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const wishCount = useWishlistCount();
  const cmpCount = useCompareCount();
  const categories = useStorefrontCategories();

  return (
    <>
      {/* Top utility bar */}
      <div className="hidden md:flex bg-slate-100/80 text-slate-600 text-[11px] py-1.5 px-6 justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <a href="tel:+8801700000000" className="inline-flex items-center gap-1.5 hover:text-indigo-300">
            <Phone className="h-3 w-3" /> +880 1700-000000
          </a>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Dhaka, Bangladesh
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/track" className="hover:text-indigo-600">Track order</Link>
          <span className="w-px h-3 bg-slate-300" />
          <Link href="/account" className="hover:text-indigo-600">Account</Link>
          <span>·</span>
          <span>BDT ৳</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/95 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden text-slate-700 p-2 -ml-2 hover:text-indigo-600 transition" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-white border-slate-200 text-slate-800 w-[85vw] sm:w-80">
              <SheetHeader>
                <SheetTitle className="text-slate-900">Browse</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                <Link href="/shop" className="block p-3 rounded-xl hover:bg-slate-50 font-medium text-slate-700 hover:text-indigo-600">All Products</Link>
                {categories.map((c) => (
                  <Link
                    key={c.value}
                    href={`/shop/${encodeURIComponent(c.value)}`}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-indigo-600"
                  >
                    <span className="flex items-center gap-3">
                      <c.icon className="h-5 w-5 text-indigo-500" />
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-400">{c.count}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link href="/wishlist" className="p-3 rounded-xl bg-slate-50 flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 hover:bg-slate-100">
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <Link href="/compare" className="p-3 rounded-xl bg-slate-50 flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 hover:bg-slate-100">
                  <GitCompareArrows className="h-4 w-4 text-indigo-500" /> Compare
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 grid place-items-center font-bold text-white shadow-lg shadow-indigo-600/30">
              A
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight hidden xs:inline sm:inline bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              AmarShop
            </span>
          </Link>

          <MegaMenu />

          <SmartSearch className="flex-1 max-w-md ml-auto md:ml-2" />

          <Link href="/wishlist" className="relative hidden sm:inline-flex p-2 text-slate-600 hover:text-rose-500 transition" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
            {wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] grid place-items-center font-semibold text-white shadow-sm shadow-rose-500/40">
                {wishCount}
              </span>
            )}
          </Link>

          <Link href="/compare" className="relative hidden sm:inline-flex p-2 text-slate-600 hover:text-indigo-600 transition" aria-label="Compare">
            <GitCompareArrows className="h-5 w-5" />
            {cmpCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-[10px] grid place-items-center font-semibold text-white shadow-sm shadow-indigo-600/40">
                {cmpCount}
              </span>
            )}
          </Link>

          <Link href="/account" className="hidden sm:inline-flex p-2 text-slate-600 hover:text-indigo-600 transition" aria-label="Account">
            <User className="h-5 w-5" />
          </Link>

          <Link href="/cart" className="relative p-2 text-slate-600 hover:text-indigo-600 transition" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-[10px] grid place-items-center font-semibold text-white shadow-sm shadow-indigo-600/40">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>
    </>
  );
}
