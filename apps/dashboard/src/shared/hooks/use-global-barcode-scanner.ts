"use client";
import { useEffect, useRef } from "react";
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

  // Keep references to latest props so we don't need to re-bind event listener
  const latest = useRef({ router, pathname, products, addToCart });
  useEffect(() => {
    latest.current = { router, pathname, products, addToCart };
  }, [router, pathname, products, addToCart]);

  // Keep scanner state in refs to persist across re-renders
  const state = useRef({
    buffer: "",
    lastTime: 0,
    timer: undefined as number | undefined,
    lastScanCode: "",
    lastScanAt: 0,
  });

  useEffect(() => {
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
      const { buffer, lastScanCode, lastScanAt } = state.current;
      const code = buffer.trim();
      state.current.buffer = "";
      
      if (code.length < 4) return;
      
      const { products, addToCart, router, pathname } = latest.current;
      const product = products.find(
        (p) =>
          p.barcode === code ||
          p.sku === code ||
          (p.serials?.some((u) => u.imei === code || u.serialNumber === code) ?? false)
      );
      
      if (!product) {
        toast.error("Product not found");
        return;
      }
      
      const now = Date.now();
      if (code === lastScanCode && now - lastScanAt < DEDUPE_MS) {
        return; // duplicate of same barcode within dedupe window
      }
      
      state.current.lastScanCode = code;
      state.current.lastScanAt = now;
      
      if (pathname.startsWith("/pos")) {
        addToCart(product.id, undefined, undefined, undefined, product.bundleQty);
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
      const fast = now - state.current.lastTime < SCANNER_CHAR_THRESHOLD_MS;
      state.current.lastTime = now;

      if (e.key === "Enter") {
        if (state.current.buffer) {
          e.preventDefault();
          flush();
        }
        return;
      }

      // Only single-char printable keys
      if (e.key.length !== 1) return;

      if (!fast && state.current.buffer) {
        // Slow keystroke -> not scanner; reset
        state.current.buffer = "";
      }

      state.current.buffer += e.key;
      window.clearTimeout(state.current.timer);
      state.current.timer = window.setTimeout(() => {
        if (state.current.buffer.length >= 6) flush();
        state.current.buffer = "";
      }, RESET_MS);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(state.current.timer);
    };
  }, []);
}
