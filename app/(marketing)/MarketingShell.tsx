"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAuth } from "@/features/auth";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();

  const getNavLinkClass = (href: string) => {
    const isActive = pathname === href;
    return isActive ? "text-foreground font-medium" : "hover:text-foreground";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Store className="h-5 w-5 text-primary" />
            <span>ShopFlow POS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className={getNavLinkClass("/")}>Home</Link>
            <Link href="/pricing" className={getNavLinkClass("/pricing")}>Pricing</Link>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row gap-4 justify-between">
          <div>&copy; {new Date().getFullYear()} ShopFlow POS. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/login" className="hover:text-foreground">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
