import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag, Menu, User, Phone, MapPin, Heart, GitCompareArrows,
} from "lucide-react";
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
      {/* Top utility bar — Royal Blue */}
      <div
        className="hidden md:flex text-[11px] py-1.5 px-6 justify-between"
        style={{
          background: "#1D4ED8",
          color: "rgba(255,255,255,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="flex items-center gap-4">
          <a
            href="tel:+8801700000000"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Phone className="h-3 w-3" /> +880 1700-000000
          </a>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Dhaka, Bangladesh
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/track" className="hover:text-white transition-colors">
            Track Order
          </Link>
          <span className="w-px h-3 bg-white/20" />
          <Link href="/account" className="hover:text-white transition-colors">
            My Account
          </Link>
          <span className="w-px h-3 bg-white/20" />
          <span className="font-medium text-white/90">BDT ৳</span>
        </div>
      </div>

      {/* Main header — sticky, white/95 */}
      <header
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b"
        style={{
          borderColor: "#DBEAFE",
          boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="md:hidden p-2 -ml-2 rounded-xl transition-colors hover:bg-[#EFF6FF]"
                style={{ color: "#2563EB" }}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-white border-[#DBEAFE] text-[#1E3A5F] w-[85vw] sm:w-80">
              <SheetHeader>
                <SheetTitle style={{ color: "#1D4ED8" }}>Browse</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                <Link
                  href="/shop"
                  className="block p-3 rounded-xl font-semibold transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  style={{ color: "#1E3A5F" }}
                >
                  All Products
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.value}
                    href={`/shop/${encodeURIComponent(c.value)}`}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                    style={{ color: "#475569" }}
                  >
                    <span className="flex items-center gap-3">
                      <c.icon className="h-5 w-5" style={{ color: "#2563EB" }} />
                      {c.label}
                    </span>
                    <span className="text-xs" style={{ color: "#94A3B8" }}>
                      {c.count}
                    </span>
                  </Link>
                ))}
              </div>
              <div
                className="mt-6 pt-5 border-t grid grid-cols-2 gap-2"
                style={{ borderColor: "#DBEAFE" }}
              >
                <Link
                  href="/wishlist"
                  className="p-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  style={{ background: "#EFF6FF", color: "#1E3A5F" }}
                >
                  <Heart className="h-4 w-4 text-rose-500" /> Wishlist
                </Link>
                <Link
                  href="/compare"
                  className="p-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  style={{ background: "#EFF6FF", color: "#1E3A5F" }}
                >
                  <GitCompareArrows className="h-4 w-4 text-[#2563EB]" /> Compare
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div
              className="h-8 w-8 rounded-xl grid place-items-center font-extrabold text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
                boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              }}
            >
              A
            </div>
            <span
              className="text-base sm:text-lg font-extrabold tracking-tight hidden xs:inline sm:inline"
              style={{
                background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AmarShop
            </span>
          </Link>

          <MegaMenu />

          <SmartSearch className="flex-1 max-w-md ml-auto md:ml-2" />

          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="relative hidden sm:inline-flex p-2 rounded-xl transition-colors hover:bg-[#EFF6FF]"
            style={{ color: "#475569" }}
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
            {wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] grid place-items-center font-bold text-white shadow-sm">
                {wishCount}
              </span>
            )}
          </Link>

          {/* Compare */}
          <Link
            href="/compare"
            className="relative hidden sm:inline-flex p-2 rounded-xl transition-colors hover:bg-[#EFF6FF]"
            style={{ color: "#475569" }}
            aria-label="Compare"
          >
            <GitCompareArrows className="h-5 w-5" />
            {cmpCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] grid place-items-center font-bold text-white shadow-sm"
                style={{ background: "#2563EB" }}
              >
                {cmpCount}
              </span>
            )}
          </Link>

          {/* Account */}
          <Link
            href="/account"
            className="hidden sm:inline-flex p-2 rounded-xl transition-colors hover:bg-[#EFF6FF]"
            style={{ color: "#475569" }}
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative p-2 rounded-xl transition-all"
            style={{ color: "#2563EB" }}
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] grid place-items-center font-bold text-white shadow-sm"
                style={{ background: "#2563EB", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}
              >
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>
    </>
  );
}
