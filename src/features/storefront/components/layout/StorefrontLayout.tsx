import type { ReactNode } from "react";
import { StorefrontFonts } from "./StorefrontFonts";
import { StorefrontHeader } from "./StorefrontHeader";
import { StorefrontFooter } from "./StorefrontFooter";
import { MobileBottomBar } from "./MobileBottomBar";

import dynamic from "next/dynamic";

const QuickViewDialog = dynamic(() => import("../product/QuickViewDialog").then(mod => mod.QuickViewDialog), { ssr: false });
const CompareTray = dynamic(() => import("../compare/CompareTray").then(mod => mod.CompareTray), { ssr: false });

/** Shared chrome for every public storefront page. */
export function StorefrontLayout({ children }: { children: ReactNode }) {
  // Sora (headings) + Manrope (body) — Awwwards-grade typography pair.

  return (
    <div
      className="min-h-screen bg-white text-[#1E3A5F] antialiased selection:bg-green-200/60 pb-20 md:pb-0"
      style={{ fontFamily: "'Manrope', 'Hind Siliguri', system-ui, sans-serif" }}
    >
      <style>{`
        .storefront-display, h1, h2, h3 { font-family: 'Inter', 'Manrope', 'Hind Siliguri', system-ui, sans-serif; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <StorefrontFonts />
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
