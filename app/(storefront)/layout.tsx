"use client";

import { useEffect } from "react";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { MobileBottomBar } from "@/features/storefront/components/layout/MobileBottomBar";
import { LiveDealTicker } from "@/features/storefront/components/home/LiveDealTicker";
import { QuickViewDialog } from "@/features/storefront/components/product/QuickViewDialog";
import { CompareTray } from "@/features/storefront/components/compare/CompareTray";

import { OrganizationJsonLd } from "@/shared/components/JsonLd";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const id = "storefront-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#020617] text-slate-100 antialiased selection:bg-indigo-500/40 pb-20 md:pb-0"
      style={{ fontFamily: "'Manrope', 'Hind Siliguri', system-ui, sans-serif" }}
    >
      <OrganizationJsonLd
        name="ShopFlow"
        url={typeof window !== "undefined" ? window.location.origin : "https://shebatech360.com"}
      />
      <style>{`
        .storefront-display, h1, h2, h3 { font-family: 'Sora', 'Hind Siliguri', system-ui, sans-serif; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <LiveDealTicker />
      <StorefrontHeader />
      <main className="min-h-[60vh]">
        {children}
      </main>
      <StorefrontFooter />
      <MobileBottomBar />
      <QuickViewDialog />
      <CompareTray />
    </div>
  );
}
