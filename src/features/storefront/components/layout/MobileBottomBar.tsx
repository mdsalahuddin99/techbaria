"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, ShoppingBag, User, Heart } from "lucide-react";
import { useCartCount } from "../../store/useCartStore";
import { useWishlistCount } from "../../store/useWishlistStore";

export function MobileBottomBar() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const wishCount = useWishlistCount();

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/98 pb-safe"
      style={{
        borderTop: "1.5px solid #DBEAFE",
        boxShadow: "0 -4px 20px rgba(37,99,235,0.10)",
      }}
    >
      <div className="flex">
        {[
          { href: "/", icon: Home, label: "Home" },
          { href: "/shop", icon: Grid2x2, label: "Shop" },
          { href: "/wishlist", icon: Heart, label: "Wishlist", badge: wishCount },
          { href: "/cart", icon: ShoppingBag, label: "Cart", badge: cartCount },
          { href: "/account", icon: User, label: "Account" },
        ].map(({ href, icon: Icon, label, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-semibold transition-all duration-200"
              style={{ color: active ? "#2563EB" : "#94A3B8" }}
            >
              <div className="relative">
                {/* Active pill indicator */}
                {active && (
                  <div
                    className="absolute -inset-1.5 rounded-xl -z-10 transition-all"
                    style={{ background: "#EFF6FF" }}
                  />
                )}
                <Icon
                  className="h-5 w-5 relative z-10 transition-transform"
                  style={{ transform: active ? "scale(1.1)" : "scale(1)" }}
                />
                {badge !== undefined && badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full text-[9px] grid place-items-center font-bold text-white"
                    style={{
                      background: href === "/wishlist" ? "#F43F5E" : "#2563EB",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
