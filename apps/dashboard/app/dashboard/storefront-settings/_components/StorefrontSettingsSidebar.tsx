"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Globe, CreditCard, Image as ImageIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  {
    title: "General",
    href: "/dashboard/storefront-settings/general",
    icon: Settings,
  },
  {
    title: "Header & Footer",
    href: "/dashboard/storefront-settings/header-footer",
    icon: Globe,
  },
  {
    title: "Hero Slides",
    href: "/dashboard/storefront-settings/hero",
    icon: ImageIcon,
  },
  {
    title: "Checkout",
    href: "/dashboard/storefront-settings/checkout",
    icon: CreditCard,
  },
];

export function StorefrontSettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted whitespace-nowrap",
              isActive 
                ? "bg-muted text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Trigger TS recheck
