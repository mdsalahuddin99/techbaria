"use client";

import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { useStorefrontProducts } from "../../hooks/useStorefrontProducts";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, GitCompareArrows, Star, X, ShieldCheck, Truck } from "lucide-react";
import { useQuickViewStore } from "../../store/useQuickViewStore";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useCompareStore, COMPARE_MAX } from "../../store/useCompareStore";
import { publicStock } from "../../hooks/useStorefrontProducts";
import { formatPrice, calcDiscountPct } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";
import { toast } from "@/shared/hooks/use-toast";

export function QuickViewDialog() {
  const id = useQuickViewStore((s) => s.productId);
  const close = useQuickViewStore((s) => s.close);
  const { all = [] } = useStorefrontProducts({ enabled: !!id });
  const product = id ? all.find((p) => p.id === id) : null;
  const add = useCartStore((s) => s.add);
  const wishHas = useWishlistStore((s) => s.has);
  const wishToggle = useWishlistStore((s) => s.toggle);
  const cmpHas = useCompareStore((s) => s.has);
  const cmpToggle = useCompareStore((s) => s.toggle);

  if (!product) return null;
  const stock = publicStock(product, all);
  const old =
    product.defaultDiscount?.mode === "percent" && product.defaultDiscount.value > 0
      ? Math.round(product.price / (1 - product.defaultDiscount.value / 100))
      : product.defaultDiscount?.mode === "amount" && product.defaultDiscount.value > 0
      ? product.price + product.defaultDiscount.value
      : undefined;
  const off = calcDiscountPct(product.price, old);
  const isWish = wishHas(product.id);
  const isCmp = cmpHas(product.id);

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-3xl bg-[#0b0b22] border-white/10 text-slate-100 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{productDisplayName(product)}</DialogTitle>
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/40 backdrop-blur grid place-items-center hover:bg-black/60"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-gradient-to-br from-indigo-900/30 to-[#020617] grid place-items-center overflow-hidden">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={productDisplayName(product)} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            ) : (
              <span className="text-[8rem] drop-shadow-[0_20px_50px_rgba(79,70,229,0.4)]">{product.emoji || "📦"}</span>
            )}
            {off && (
              <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-md bg-rose-500 text-white">
                -{off}% OFF
              </span>
            )}
          </div>
          <div className="p-5 sm:p-6 flex flex-col">
            <div className="text-xs text-indigo-300">{product.category}</div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">{productDisplayName(product)}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-slate-200 font-medium">4.8</span>
              <span>·</span>
              <span>{stock > 0 ? `${stock} in stock` : "Out of stock"}</span>
              {product.brand && (
                <>
                  <span>·</span>
                  <span className="text-slate-300">{product.brand}</span>
                </>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-white">{formatPrice(product.price)}</div>
              {old && <div className="text-sm text-slate-500 line-through">{formatPrice(old)}</div>}
            </div>
            {(product.model || product.brand) && (
              <p className="mt-3 text-sm text-slate-400 line-clamp-4">
                {[product.brand, product.model].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-indigo-300" /> ফ্রি ডেলিভারি</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-300" /> Official Warranty</div>
            </div>

            <div className="mt-auto pt-5 flex flex-wrap gap-2">
              <button
                disabled={stock <= 0}
                onClick={() => {
                  add({
                    productId: product.id,
                    name: productDisplayName(product),
                    price: product.price,
                    emoji: product.emoji,
                    imageUrl: product.imageUrl,
                    maxStock: stock,
                  });
                  toast({ title: "Cart-এ যোগ হয়েছে", description: productDisplayName(product) });
                  close();
                }}
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
              <Link
                href={`/p/${encodeURIComponent(product.slug || product.id)}`}
                onClick={close}
                className="h-11 px-4 rounded-xl bg-card/5 border border-white/10 hover:bg-card/10 text-sm font-medium grid place-items-center"
              >
                Details
              </Link>
              <button
                onClick={() => wishToggle(product.id)}
                className={`h-11 w-11 rounded-xl border grid place-items-center transition ${
                  isWish ? "bg-rose-500/20 border-rose-400/40 text-rose-300" : "bg-card/5 border-white/10 text-slate-300 hover:text-rose-300"
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`h-4 w-4 ${isWish ? "fill-rose-400" : ""}`} />
              </button>
              <button
                onClick={() => {
                  const ok = cmpToggle(product.id);
                  if (!ok) toast({ title: `Maximum ${COMPARE_MAX} products compare করা যাবে`, variant: "destructive" });
                }}
                className={`h-11 w-11 rounded-xl border grid place-items-center transition ${
                  isCmp ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-300" : "bg-card/5 border-white/10 text-slate-300 hover:text-indigo-300"
                }`}
                aria-label="Compare"
              >
                <GitCompareArrows className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
