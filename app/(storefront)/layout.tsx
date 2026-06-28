import { StorefrontFonts } from "@/features/storefront/components/layout/StorefrontFonts";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { MobileBottomBar } from "@/features/storefront/components/layout/MobileBottomBar";
import { QuickViewDialog } from "@/features/storefront/components/product/QuickViewDialog";
import { CompareTray } from "@/features/storefront/components/compare/CompareTray";

import { OrganizationJsonLd } from "@/shared/components/JsonLd";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-mesh text-slate-900 antialiased selection:bg-indigo-500/20 pb-20 md:pb-0"
      style={{ fontFamily: "'Manrope', 'Hind Siliguri', system-ui, sans-serif" }}
    >
      <OrganizationJsonLd
        name="ShopFlow"
        url={typeof window !== "undefined" ? window.location.origin : "https://shebatech360.com"}
      />
      <StorefrontFonts />
      <style>{`
        .storefront-display, h1, h2, h3 { font-family: 'Sora', 'Hind Siliguri', system-ui, sans-serif; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
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
