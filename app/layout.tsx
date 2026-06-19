import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import '@/index.css';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shebatech360.com";

export const metadata: Metadata = {
  title: {
    template: "%s | ShopFlow",
    default: "ShopFlow POS — Point of Sale & Inventory",
  },
  description: "Modern POS terminal and inventory management for retail shops. Sales, products, customers, and reports in one place.",
  authors: [{ name: "ShopFlow" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShopFlow",
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
