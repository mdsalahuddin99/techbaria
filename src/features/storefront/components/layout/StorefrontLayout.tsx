import type { ReactNode } from "react";
import { useEffect } from "react";
import { StorefrontHeader } from "./StorefrontHeader";
import { StorefrontFooter } from "./StorefrontFooter";
import { MobileBottomBar } from "./MobileBottomBar";

import { QuickViewDialog } from "../product/QuickViewDialog";
import { CompareTray } from "../compare/CompareTray";

/** Shared chrome for every public storefront page. */
export function StorefrontLayout({ children }: { children: ReactNode }) {
  // Sora (headings) + Manrope (body) — Awwwards-grade typography pair.
  useEffect(() => {
    const id = "storefront-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-[#1E3A5F] antialiased selection:bg-blue-200/60 pb-20 md:pb-0"
      style={{ fontFamily: "'Manrope', 'Hind Siliguri', system-ui, sans-serif" }}
    >
      <style>{`
        .storefront-display, h1, h2, h3 { font-family: 'Inter', 'Manrope', 'Hind Siliguri', system-ui, sans-serif; letter-spacing: -0.02em; }
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
