"use client";

import { useEffect } from "react";

export function StorefrontFonts() {
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

  return null;
}
