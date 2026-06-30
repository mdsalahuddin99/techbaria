import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import '@/index.css';

// ─── Font ────────────────────────────────────────────────────────────────────
// next/font/google self-hosts Inter at build time:
//   • Zero external network request to fonts.googleapis.com
//   • Zero render-blocking (no <link rel="stylesheet"> in <head>)
//   • Font is served from the same origin → faster, no CORS
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',   // fallback font shown instantly; Inter swaps in when ready
  preload: true,
});

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shebatech360.com";

export const metadata: Metadata = {
  title: {
    template: "%s | ShopFlow",
    default: "ShopFlow POS — Point of Sale & Inventory",
  },
  description: "Modern POS terminal and inventory management for retail shops. Sales, products, customers, and reports in one place.",
  authors: [{ name: "ShopFlow" }],
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE,
    siteName: "ShopFlow",
    title: "ShopFlow POS — Point of Sale & Inventory",
    description: "Modern POS terminal and inventory management for retail shops.",
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopFlow POS — Point of Sale & Inventory",
    description: "Modern POS terminal and inventory management for retail shops.",
    images: [`${BASE}/og-image.png`],
  },
  metadataBase: new URL(BASE),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // inter.variable injects --font-inter CSS variable into <html>
    // Use it in CSS/Tailwind: font-family: var(--font-inter)
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                registration.unregister();
              }
            });
          }
        `}} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

