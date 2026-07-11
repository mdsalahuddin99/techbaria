"use client";

import { useEffect } from "react";

/**
 * Injects JSON-LD structured data into <head> via a script tag.
 * Works in client components (all Dashboard/Storefront pages are "use client").
 */
export function JsonLd({ id, json }: { id: string; json: Record<string, unknown> }) {
  useEffect(() => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(json);
    document.head.appendChild(script);
    return () => script.remove();
  }, [id, json]);
  return null;
}

/** Organization schema for the landing page / root layout. */
export function OrganizationJsonLd({ name, url, logo }: { name: string; url: string; logo?: string }) {
  return (
    <JsonLd
      id="org-schema"
      json={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        url,
        ...(logo ? { logo, image: logo } : {}),
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+880",
          contactType: "customer service",
        },
        sameAs: [url].filter(Boolean),
      }}
    />
  );
}

/** Product schema for individual product pages. */
export function ProductJsonLd({
  name,
  description,
  sku,
  price,
  currency = "BDT",
  image,
  url,
  brand,
  availability = "InStock",
}: {
  name: string;
  description?: string;
  sku?: string;
  price: number;
  currency?: string;
  image?: string;
  url?: string;
  brand?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
}) {
  return (
    <JsonLd
      id="product-schema"
      json={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        ...(description ? { description } : {}),
        ...(sku ? { sku } : {}),
        ...(image ? { image } : {}),
        ...(url ? { url } : {}),
        ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
        offers: {
          "@type": "Offer",
          price,
          priceCurrency: currency,
          availability: `https://schema.org/${availability}`,
        },
      }}
    />
  );
}
