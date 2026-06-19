"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, ShoppingBag, User, Heart } from "lucide-react";
import { useCartCount } from "../../store/useCartStore";
import { useWishlistCount } from "../../store/useWishlistStore";

const cx = (active: boolean) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] ${
    active ? "text-indigo-300" : "text-slate-400"
  }`;

export function MobileBottomBar() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const wishCount = useWishlistCount();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#020617]/95 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex">
        <Link href="/storefront" className={cx(pathname === "/storefront")}>
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/storefront/shop" className={cx(pathname === "/storefront/shop")}>
          <Grid2x2 className="h-5 w-5" />
          <span>Shop</span>
        </Link>
        <Link href="/storefront/wishlist" className={cx(pathname === "/storefront/wishlist")}>
          <div className="relative">
            <Heart className="h-5 w-5" />
            {wishCount > 0 && (
              <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] grid place-items-center font-semibold text-white">
                {wishCount}
              </span>
            )}
          </div>
          <span>Wishlist</span>
        </Link>
        <Link href="/storefront/cart" className={cx(pathname === "/storefront/cart")}>
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-[10px] grid place-items-center font-semibold text-white">
                {cartCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </Link>
        <Link href="/storefront/account" className={cx(pathname === "/storefront/account")}>
          <User className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </div>
    </nav>
  );
}
