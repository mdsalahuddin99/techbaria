"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star, ShoppingBag, Eye, GitCompareArrows } from "lucide-react";
import type { StorefrontProduct } from "@/features/storefront/types";
import { formatPrice, calcDiscountPct } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useCompareStore, COMPARE_MAX } from "../../store/useCompareStore";
import { useQuickViewStore } from "../../store/useQuickViewStore";
import { publicStock } from "../../hooks/useStorefrontProducts";
import { toast } from "@/shared/hooks/use-toast";

interface Props {
  product: StorefrontProduct;
  allProducts: StorefrontProduct[];
}

/**
 * Premium high-converting product card.
 * - 20px border radius, blue shadow
 * - Discount badge (orange) top-left, wishlist top-right
 * - Sky blue image background, image zoom on hover
 * - Full-width "Add to Cart" button at the bottom
 * - Quick view on hover overlay
 * - NEW / HOT badge support
 */
export function ProductCard({ product, allProducts }: Props) {
  const add = useCartStore((s) => s.add);
  const wishHas = useWishlistStore((s) => s.has);
  const wishToggle = useWishlistStore((s) => s.toggle);
  const cmpHas = useCompareStore((s) => s.has);
  const cmpToggle = useCompareStore((s) => s.toggle);
  const openQuick = useQuickViewStore((s) => s.open);

  const stock = publicStock(product, allProducts);
  const oldPrice =
    product.defaultDiscount?.mode === "percent" && product.defaultDiscount.value > 0
      ? Math.round(product.price / (1 - product.defaultDiscount.value / 100))
      : product.defaultDiscount?.mode === "amount" && product.defaultDiscount.value > 0
      ? product.price + product.defaultDiscount.value
      : undefined;
  const off = calcDiscountPct(product.price, oldPrice);
  const outOfStock = stock <= 0;
  const isWish = wishHas(product.id);
  const isCmp = cmpHas(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    add({
      productId: product.id,
      name: productDisplayName(product),
      price: product.price,
      emoji: product.emoji,
      imageUrl: product.imageUrl,
      maxStock: stock,
    });
    toast({ title: "Cart-এ যোগ হয়েছে ✓", description: productDisplayName(product) });
  };

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Link
      href={`/p/${encodeURIComponent(product.slug || product.id)}`}
      className="group relative flex flex-col bg-white rounded-[20px] overflow-hidden transition-all duration-300 hover:-translate-y-2"
      style={{
        boxShadow: "0 4px 24px rgba(37,99,235,0.08)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 16px 48px rgba(37,99,235,0.18)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = "0 4px 24px rgba(37,99,235,0.08)")
      }
    >
      {/* ── Image area ── */}
      <div
        className="relative w-full aspect-[4/3] overflow-hidden bg-white"
      >
        {/* Product image */}
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={productDisplayName(product)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-4 transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-5xl sm:text-6xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
            {product.emoji || "📦"}
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {off && <span className="sf-badge-offer">-{off}%</span>}
          {!off && product.brand && (
            <span className="sf-badge-new">{product.brand.length > 5 ? "NEW" : product.brand}</span>
          )}
        </div>

        {/* Wishlist — always visible top-right */}
        <button
          onClick={stopAnd(() => wishToggle(product.id))}
          aria-label="Wishlist"
          className={`sf-wishlist-btn absolute top-2.5 right-2.5 z-10 ${isWish ? "active" : ""}`}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 4px 12px rgba(244,63,94,0.2)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 2px 8px rgba(0,0,0,0.08)")
          }
        >
          <Heart
            className="h-3.5 w-3.5 transition-colors"
            style={{ color: isWish ? "#F43F5E" : "#94A3B8" }}
            fill={isWish ? "#F43F5E" : "none"}
          />
        </button>

        {/* Quick view + compare — slide in on hover */}
        <div className="absolute left-2.5 bottom-2.5 flex flex-col gap-1.5 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button
            onClick={stopAnd(() => openQuick(product.id))}
            aria-label="Quick view"
            className="h-8 w-8 rounded-full bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center transition-all duration-200 hover:border-[#16A34A] hover:bg-[#F0FDF4]"
          >
            <Eye className="h-3.5 w-3.5" style={{ color: "#16A34A" }} />
          </button>
          <button
            onClick={stopAnd(() => {
              const ok = cmpToggle(product.id);
              if (!ok)
                toast({ title: `Max ${COMPARE_MAX} products compare করা যাবে`, variant: "destructive" });
            })}
            aria-label="Compare"
            className={`h-8 w-8 rounded-full border shadow-sm flex items-center justify-center transition-all duration-200 ${
              isCmp
                ? "bg-[#F0FDF4] border-[#16A34A]"
                : "bg-white border-[#E2E8F0] hover:border-[#16A34A] hover:bg-[#F0FDF4]"
            }`}
          >
            <GitCompareArrows
              className="h-3.5 w-3.5"
              style={{ color: "#16A34A" }}
            />
          </button>
        </div>

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] grid place-items-center z-20">
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border"
              style={{ color: "#EF4444", borderColor: "#FECACA" }}
            >
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* ── Info area ── */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        {/* Category label */}
        <div
          className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase"
          style={{ color: "#06B6D4" }}
        >
          {product.category}
        </div>

        {/* Product name — 2-line clamp */}
        <div
          className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug min-h-[2.5rem] transition-colors duration-200 group-hover:text-[#16A34A]"
          style={{ color: "#1E3A5F" }}
        >
          {productDisplayName(product)}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className="h-3 w-3"
              fill={s <= 4 ? "#FBBF24" : "none"}
              style={{ color: "#FBBF24" }}
            />
          ))}
          <span className="text-[10px] font-semibold ml-1" style={{ color: "#475569" }}>
            4.8
          </span>
          {stock > 0 && stock < 5 ? (
            <span className="text-[10px] font-semibold ml-1" style={{ color: "#F97316" }}>
              · Only {stock} left
            </span>
          ) : stock > 0 ? (
            <span className="text-[10px] ml-1" style={{ color: "#06B6D4" }}>
              · In stock
            </span>
          ) : null}
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-base sm:text-lg font-extrabold" style={{ color: "#16A34A" }}>
            {formatPrice(product.price)}
          </span>
          {oldPrice && (
            <span className="text-xs line-through" style={{ color: "#94A3B8" }}>
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Full-width Add to Cart button */}
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          aria-label="Add to cart"
          className="sf-btn-cart mt-1"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span>Add to Cart</span>
        </button>
      </div>
    </Link>
  );
}
