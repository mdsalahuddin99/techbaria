"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useProducts } from "@/features/products/hooks";
import { useCartActions } from "@/features/pos/hooks";

/**
 * Listens for fast keystroke sequences typical of USB/Bluetooth barcode scanners
 * (rapid characters terminated by Enter) anywhere in the app.
 *
 * - Ignored when the user is typing in an editable field, modal input, or POS barcode box.
 * - On scan: if the code matches a known product → if on /pos add to cart, otherwise navigate
 *   to /products with the SKU/barcode pre-filtered.
 */
export function useGlobalBarcodeScanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: products = [] } = useProducts();
  const { addToCart } = useCartActions();

  useEffect(() => {
    let buffer = "";
    let lastTime = 0;
    let timer: number | undefined;
    let lastScanCode = "";
    let lastScanAt = 0;

    const SCANNER_CHAR_THRESHOLD_MS = 50; // chars closer than this = scanner
    const RESET_MS = 150;
    const DEDUPE_MS = 1200;

    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const flush = () => {
      const code = buffer.trim();
      buffer = "";
      if (code.length < 4) return;
      const product = products.find(
        (p) =>
          p.barcode === code ||
          p.sku === code ||
          (p.serials?.some((u) => u.imei === code || u.serialNumber === code) ?? false)
      );
      if (!product) {
        toast.error(`No product for "${code}"`);
        return;
      }
      const now = Date.now();
      if (code === lastScanCode && now - lastScanAt < DEDUPE_MS) {
        return; // duplicate of same barcode within dedupe window
      }
      lastScanCode = code;
      lastScanAt = now;
      if (pathname.startsWith("/pos")) {
        addToCart(product.id);
        toast.success(`✓ ${product.name}`);
      } else {
        toast.success(`Found: ${product.name}`);
        router.push(`/products?search=${encodeURIComponent(product.sku)}`);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      // Ignore typing in editable fields — they have their own handling.
      if (isEditable(e.target)) return;

      const now = Date.now();
      const fast = now - lastTime < SCANNER_CHAR_THRESHOLD_MS;
      lastTime = now;

      if (e.key === "Enter") {
        if (buffer) {
          e.preventDefault();
          flush();
        }
        return;
      }

      // Only single-char printable keys
      if (e.key.length !== 1) return;

      if (!fast && buffer) {
        // Slow keystroke -> not scanner; reset
        buffer = "";
      }

      buffer += e.key;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (buffer.length >= 6) flush();
        buffer = "";
      }, RESET_MS);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [products, addToCart, router, pathname]);
}
