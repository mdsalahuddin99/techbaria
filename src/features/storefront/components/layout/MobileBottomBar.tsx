"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, ShoppingBag, User, Heart } from "lucide-react";
import { useCartCount } from "../../store/useCartStore";
import { useWishlistCount } from "../../store/useWishlistStore";

const cx = (active: boolean) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] transition ${
    active ? "text-indigo-600 font-medium" : "text-slate-500 hover:text-slate-700"
  }`;

export function MobileBottomBar() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const wishCount = useWishlistCount();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_12px_rgb(0,0,0,0.03)] pb-safe">
      <div className="flex">
        <Link href="/" className={cx(pathname === "/")}>
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/shop" className={cx(pathname === "/shop")}>
          <Grid2x2 className="h-5 w-5" />
          <span>Shop</span>
        </Link>
        <Link href="/wishlist" className={cx(pathname === "/wishlist")}>
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
        <Link href="/cart" className={cx(pathname === "/cart")}>
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
        <Link href="/account" className={cx(pathname === "/account")}>
          <User className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </div>
    </nav>
  );
}
