"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

export function ProductCard({ product, allProducts }: Props) {
  const add = useCartStore((s) => s.add);
  const wishHas = useWishlistStore((s) => s.has);
  const wishToggle = useWishlistStore((s) => s.toggle);
  const cmpHas = useCompareStore((s) => s.has);
  const cmpToggle = useCompareStore((s) => s.toggle);
  const openQuick = useQuickViewStore((s) => s.open);
  const router = useRouter();

  const stock = publicStock(product, allProducts);
  const originalPrice = product.compareAtPrice;
  const hasDiscount = originalPrice && originalPrice > product.price;
  const off = hasDiscount ? calcDiscountPct(product.price, originalPrice) : undefined;
  const outOfStock = stock <= 0;
  const isWish = wishHas(product.id);
  const isCmp = cmpHas(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      productId: product.id,
      name: productDisplayName(product),
      price: product.price,
      emoji: product.emoji,
      imageUrl: product.imageUrl,
      maxStock: stock,
    });
    router.push("/checkout");
  };

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Link
      href={`/p/${encodeURIComponent(product.slug || product.id)}`}
      className="group relative flex flex-col bg-card rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-transparent hover:border-border/50"
      style={{
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.08)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)")
      }
    >
      {/* Image Container with Actions overlay */}
      <div className="relative w-full aspect-square bg-muted/20 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={productDisplayName(product)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-6xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
            {product.emoji || "📦"}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {off && (
            <span className="px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold tracking-wide shadow-sm">
              -{off}%
            </span>
          )}
          {!off && product.brand && (
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide backdrop-blur-md">
              {product.brand.length > 5 ? "NEW" : product.brand}
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={stopAnd(() => wishToggle(product.id))}
          aria-label="Wishlist"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-md border border-border/50 flex items-center justify-center transition-all hover:scale-110 hover:bg-background shadow-sm"
        >
          <Heart
            className="h-4 w-4 transition-colors"
            style={{ color: isWish ? "#ef4444" : "currentColor" }}
            fill={isWish ? "#ef4444" : "none"}
          />
        </button>



        {/* Quick View & Compare (Slide in from left) */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 -translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
          <button
            onClick={stopAnd(() => openQuick(product.id))}
            className="h-8 w-8 rounded-full bg-background/90 backdrop-blur-md border border-border/50 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground shadow-sm"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={stopAnd(() => cmpToggle(product.id))}
            className="h-8 w-8 rounded-full bg-background/90 backdrop-blur-md border border-border/50 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground shadow-sm"
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* Info Area */}
      <div className="flex flex-col p-4 flex-1">
        {/* Category */}
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {product.category}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors">
          {productDisplayName(product)}
        </h3>

        {/* Price & Rating Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            {outOfStock ? (
              <div className="flex items-center gap-1.5">
                <span className="text-lg md:text-xl font-black text-rose-500 tracking-tight">
                  Out of Stock
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-lg md:text-xl font-black text-primary tracking-tight">
                  {formatPrice(product.price)}
                </span>
                {originalPrice && originalPrice > product.price && (
                  <>
                    <span className="text-sm font-medium line-through text-muted-foreground/70">
                      {formatPrice(originalPrice)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400 whitespace-nowrap">
                      Save {formatPrice(originalPrice - product.price)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-500">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-[10px] font-bold">4.8</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          {/* Add to Cart (Icon only on mobile, text + icon on tablet/desktop) */}
          <button
            onClick={handleAdd}
            title="Add to Cart"
            className="flex items-center justify-center gap-1.5 bg-white text-primary font-bold text-[11px] h-8 sm:h-9 w-8 sm:w-auto sm:flex-1 sm:py-2 rounded border border-primary transition-colors hover:bg-primary/5 shadow-sm shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add to Cart</span>
          </button>
          
          {/* Buy Now (Full width on mobile) */}
          <button
            onClick={handleBuyNow}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#16A34A] text-white font-bold text-[11px] h-8 sm:h-9 sm:py-2 rounded transition-colors hover:bg-[#15803D] shadow-sm"
          >
            {outOfStock ? "Pre Order" : "Buy Now"}
          </button>
        </div>
      </div>
    </Link>
  );
}
