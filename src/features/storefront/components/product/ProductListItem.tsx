import Link from "next/link";
import { Heart, ShoppingBag, Eye, GitCompareArrows, Star, ShieldCheck, Truck } from "lucide-react";
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

/** Horizontal list-view product card for shop page list mode. */
export function ProductListItem({ product, allProducts }: Props) {
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
  const out = stock <= 0;
  const isWish = wishHas(product.id);
  const isCmp = cmpHas(product.id);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Link
      href={`/p/${encodeURIComponent(product.slug || product.id)}`}
      className="group relative flex gap-3 sm:gap-5 rounded-2xl bg-card/[0.04] border border-white/10 hover:border-indigo-400/40 hover:bg-card/[0.06] transition p-3 sm:p-4"
    >
      <div className="relative h-28 w-28 sm:h-40 sm:w-40 shrink-0 rounded-xl bg-gradient-to-br from-indigo-950/40 to-transparent overflow-hidden grid place-items-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={productDisplayName(product)}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <span className="text-5xl">{product.emoji || "📦"}</span>
        )}
        {off && (
          <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-rose-500 to-pink-500 text-white">
            -{off}%
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-indigo-300 mb-0.5">{product.category}{product.brand ? ` · ${product.brand}` : ""}</div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-100 line-clamp-2 group-hover:text-indigo-200 transition">
              {productDisplayName(product)}
            </h3>
          </div>
        </div>

        <div className="mt-1 flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-slate-200 font-medium">4.8</span>
          </span>
          <span>·</span>
          {out ? (
            <span className="text-rose-300">Out of stock</span>
          ) : stock < 5 ? (
            <span className="text-amber-300">Only {stock} left</span>
          ) : (
            <span className="text-emerald-300">In stock</span>
          )}
        </div>

        <div className="mt-2 hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-indigo-300" /> Free delivery</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-indigo-300" /> Official warranty</span>
        </div>

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-base sm:text-xl font-bold text-white">{formatPrice(product.price)}</div>
            {oldPrice && (
              <div className="text-[10px] sm:text-xs text-slate-500 line-through">{formatPrice(oldPrice)}</div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={stop(() => wishToggle(product.id))}
              className={`h-9 w-9 rounded-xl border grid place-items-center transition ${
                isWish ? "bg-rose-500/20 border-rose-400/40 text-rose-300" : "bg-card/5 border-white/10 text-slate-300 hover:text-rose-300"
              }`}
              aria-label="Wishlist"
            >
              <Heart className={`h-4 w-4 ${isWish ? "fill-rose-400" : ""}`} />
            </button>
            <button
              onClick={stop(() => openQuick(product.id))}
              className="hidden sm:grid h-9 w-9 rounded-xl bg-card/5 border border-white/10 place-items-center text-slate-300 hover:text-indigo-300 transition"
              aria-label="Quick view"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={stop(() => {
                const ok = cmpToggle(product.id);
                if (!ok) toast({ title: `Max ${COMPARE_MAX} products compare করা যাবে`, variant: "destructive" });
              })}
              className={`hidden sm:grid h-9 w-9 rounded-xl border place-items-center transition ${
                isCmp ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-300" : "bg-card/5 border-white/10 text-slate-300 hover:text-indigo-300"
              }`}
              aria-label="Compare"
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
            <button
              onClick={stop(() => {
                if (out) return;
                add({
                  productId: product.id,
                  name: productDisplayName(product),
                  price: product.price,
                  emoji: product.emoji,
                  imageUrl: product.imageUrl,
                  maxStock: stock,
                });
                toast({ title: "Cart-এ যোগ হয়েছে", description: productDisplayName(product) });
              })}
              disabled={out}
              className="h-9 px-3 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
