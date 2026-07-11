"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingBag, Menu, User, Phone, MapPin, Heart, GitCompareArrows, LogOut, LogIn
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { useCartCount } from "../../store/useCartStore";
import { useWishlistCount } from "../../store/useWishlistStore";
import { useCompareCount } from "../../store/useCompareStore";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";
import { SmartSearch } from "../search/SmartSearch";
import { CategoryNav } from "./CategoryNav";
import { useSession, signOut } from "next-auth/react";
import { useSiteConfig } from "../../hooks/useSiteConfig";
import { useHydration } from "@/shared/hooks/useHydration";

export function StorefrontHeader() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const wishCount = useWishlistCount();
  const cmpCount = useCompareCount();
  const categories = useStorefrontCategories();
  const { data: session } = useSession();
  const { data: generalData } = useSiteConfig("general");
  const isMounted = useHydration();

  return (
    <>
      {/* Main header — sticky, white/90 frosted glass */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-0 min-h-[4rem] sm:h-20 flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start gap-y-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="md:hidden p-2.5 -ml-2 rounded-full transition-all duration-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-white/95 backdrop-blur-lg border-emerald-100/50 text-slate-800 w-[85vw] sm:w-80 shadow-2xl">
              <SheetHeader>
                <SheetTitle className="text-emerald-700 font-bold">Browse</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                <Link
                  href="/shop"
                  className="block p-3 rounded-xl font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-600 text-slate-700"
                >
                  All Products
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.value}
                    href={`/shop/${encodeURIComponent(c.value)}`}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-emerald-50 hover:text-emerald-600 text-slate-600"
                  >
                    <span className="flex items-center gap-3">
                      <c.icon className="h-5 w-5 text-emerald-500" />
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {c.count}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link
                  href="/wishlist"
                  className="p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-emerald-50 bg-slate-50 text-slate-700 hover:text-emerald-600 border border-slate-100"
                >
                  <Heart className="h-4 w-4 text-rose-500" /> Wishlist
                </Link>
                <Link
                  href="/compare"
                  className="p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-emerald-50 bg-slate-50 text-slate-700 hover:text-emerald-600 border border-slate-100"
                >
                  <GitCompareArrows className="h-4 w-4 text-emerald-500" /> Compare
                </Link>
                <Link
                  href="/track"
                  className="p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-emerald-50 bg-slate-50 text-slate-700 hover:text-emerald-600 border border-slate-100 col-span-2"
                >
                  Track Order
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            {generalData?.logoUrl ? (
              <div className="relative h-10 w-[140px]">
                <Image 
                  src={generalData.logoUrl} 
                  alt={generalData?.storeName || "Logo"} 
                  fill
                  sizes="140px"
                  className="object-contain object-left group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <>
                <div className="h-10 w-10 rounded-xl grid place-items-center font-black text-white shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700 group-hover:scale-105 transition-transform duration-300 ring-2 ring-emerald-500/20">
                  {generalData?.storeName ? generalData.storeName.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="text-xl font-extrabold tracking-tight hidden xs:inline sm:inline bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-emerald-600">
                  {generalData?.storeName || "AmarShop"}
                </span>
              </>
            )}
          </Link>
          </div>

          <SmartSearch className="w-full order-last sm:order-none sm:flex-1 sm:max-w-xl sm:ml-auto md:ml-4 lg:ml-8 transition-all duration-300" />

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
            
            <Link href="/track" className="hidden lg:flex items-center text-[13px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors mr-2">
              Track Order
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative hidden sm:flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:bg-slate-100 text-slate-500 hover:text-rose-500"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {isMounted && wishCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-[10px] flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-white">
                  {wishCount}
                </span>
              )}
            </Link>

            {/* Compare */}
            <Link
              href="/compare"
              className="relative hidden sm:flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
              aria-label="Compare"
            >
              <GitCompareArrows className="h-5 w-5" />
              {isMounted && cmpCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-white">
                  {cmpCount}
                </span>
              )}
            </Link>

            {/* Account / Login - Icon for mobile/tablet */}
            <Link
              href={session?.user ? "/account" : "/login"}
              className="hidden sm:flex lg:hidden h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
              aria-label={session?.user ? "Account" : "Login"}
            >
              {session?.user ? <User className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            </Link>

            {/* Account / Login - Text for desktop */}
            <div className="hidden lg:flex items-center gap-4 border-l border-slate-200 pl-4 ml-1">
              {session?.user ? (
                <>
                  <Link href="/account" className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
                    <User className="h-4 w-4" /> My Account
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-rose-500 transition-colors">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
                    <LogIn className="h-4 w-4" /> Login
                  </Link>
                  <Link href="/register" className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 sm:bg-transparent sm:ml-2"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {isMounted && cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-emerald-600 text-[10px] flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* New Star Tech style category navigation */}
      <CategoryNav />
    </>
  );
}
