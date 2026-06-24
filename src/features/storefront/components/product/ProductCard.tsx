import Link from "next/link";
import { Heart, Star, ShoppingBag, Eye, GitCompareArrows } from "lucide-react";
import type { Product } from "@/features/products/types";
import { formatPrice, calcDiscountPct } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useCompareStore, COMPARE_MAX } from "../../store/useCompareStore";
import { useQuickViewStore } from "../../store/useQuickViewStore";
import { publicStock } from "../../hooks/useStorefrontProducts";
import { toast } from "@/shared/hooks/use-toast";

interface Props {
  product: Product;
  allProducts: Product[];
}

/**
 * Premium product card with 3D-tilt hover, quick view overlay,
 * wishlist + compare actions, and animated CTA.
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
    toast({ title: "Cart-এ যোগ হয়েছে", description: productDisplayName(product) });
  };

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Link
      href={`/p/${encodeURIComponent(product.slug || product.id)}`}
      className="group relative flex flex-col rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden hover:border-indigo-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5"
    >
      <div className="relative aspect-square bg-white grid place-items-center overflow-hidden border-b border-slate-100">

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={productDisplayName(product)}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-4 transition duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="text-5xl sm:text-6xl transition duration-500 group-hover:scale-125 group-hover:-rotate-6">
            {product.emoji || "📦"}
          </div>
        )}

        {off && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-900/40">
            -{off}%
          </span>
        )}
        {product.brand && (
          <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur text-slate-700 border border-slate-200 shadow-sm">
            {product.brand}
          </span>
        )}

        {/* Hover action rail */}
        <div className="absolute right-2 bottom-2 flex flex-col gap-1.5 translate-x-12 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={stopAnd(() => wishToggle(product.id))}
            className={`h-8 w-8 rounded-full border grid place-items-center backdrop-blur shadow-sm transition ${
              isWish
                ? "bg-rose-50 border-rose-200 text-rose-500"
                : "bg-white/90 border-slate-200 text-slate-600 hover:text-rose-500 hover:bg-white"
            }`}
            aria-label="Wishlist"
          >
            <Heart className={`h-3.5 w-3.5 ${isWish ? "fill-rose-500" : ""}`} />
          </button>
          <button
            onClick={stopAnd(() => openQuick(product.id))}
            className="h-8 w-8 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm grid place-items-center text-slate-600 hover:text-indigo-600 hover:bg-white transition"
            aria-label="Quick view"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={stopAnd(() => {
              const ok = cmpToggle(product.id);
              if (!ok) toast({ title: `Max ${COMPARE_MAX} products compare করা যাবে`, variant: "destructive" });
            })}
            className={`h-8 w-8 rounded-full border grid place-items-center backdrop-blur shadow-sm transition ${
              isCmp
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-white/90 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-white"
            }`}
            aria-label="Compare"
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
          </button>
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] grid place-items-center">
            <span className="text-xs font-semibold text-rose-600 px-2 py-1 rounded-full bg-rose-50 border border-rose-200 shadow-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="text-[10px] sm:text-xs text-slate-400 font-semibold tracking-wide uppercase">{product.category}</div>
        <div className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed min-h-[2.5rem] group-hover:text-indigo-700 transition-colors">
          {productDisplayName(product)}
        </div>

        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-slate-700 font-medium">4.8</span>
          <span>·</span>
          {stock > 0 && stock < 5 ? (
            <span className="text-amber-600 font-medium">Only {stock} left</span>
          ) : stock > 0 ? (
            <span>In stock</span>
          ) : null}
        </div>

        <div className="flex items-end justify-between mt-1 gap-1">
          <div className="min-w-0">
            {oldPrice && (
              <div className="text-[10px] sm:text-xs text-slate-400 line-through mb-0.5">{formatPrice(oldPrice)}</div>
            )}
            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">{formatPrice(product.price)}</div>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="shrink-0 h-9 px-4 rounded-full bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white disabled:bg-slate-50 disabled:text-slate-400 flex items-center gap-1.5 text-xs font-extrabold transition-colors group-hover:shadow-md group-hover:bg-indigo-600 group-hover:text-white"
            aria-label="Add to cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
