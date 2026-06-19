"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Minus,
  Plus,
  Share2,
  GitCompareArrows,
  Check,
  ChevronRight,
  Zap,
  Package,
  CreditCard,
  Sparkles,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Progress } from "@/shared/ui/progress";
import { useProductDetail, useCartStore, formatPrice, useSeo } from "@/features/storefront";
import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";
import { useWishlistStore } from "@/features/storefront/store/useWishlistStore";
import { useCompareStore } from "@/features/storefront/store/useCompareStore";
import { toast } from "@/shared/hooks/use-toast";
import { cn } from "@/shared/lib/utils";

export default function StorefrontProduct() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();
  const { product, related, stock, isLoading } = useProductDetail(slug);
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  // Mock variant options — derived from product attributes with fallback alternatives.
  const colorOptions = useMemo(() => {
    const base = product?.color?.split(/[,/]/).map((s) => s.trim()).filter(Boolean) ?? [];
    if (base.length >= 2) return base;
    if (product?.color) return [product.color, "Black", "Silver"].filter((v, i, a) => a.indexOf(v) === i);
    return ["Black", "Silver", "Blue"];
  }, [product]);

  const storageOptions = useMemo(() => {
    if (!product?.storage) return [] as string[];
    const base = product.storage.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
    return base.length >= 2 ? base : [product.storage, "128GB", "256GB", "512GB"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
  }, [product]);

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");

  const wishlisted = useWishlistStore((s) => (product ? s.ids.includes(product.id) : false));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const compared = useCompareStore((s) => (product ? s.ids.includes(product.id) : false));
  const toggleCompare = useCompareStore((s) => s.toggle);

  useSeo({
    title: product ? `${product.name} — AmarShop` : "Product — AmarShop",
    description: product
      ? `${product.name}${product.brand ? ` by ${product.brand}` : ""} — ${formatPrice(product.price)}.`
      : undefined,
  });

  // Build gallery — real imageUrl first, then mock alternate angles for richer UX.
  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const real = [product.imageUrl].filter(Boolean) as string[];
    if (real.length === 0) return [];
    // Mock additional angles using Unsplash-style transforms on the same URL
    const variations = [
      real[0],
      `${real[0]}${real[0].includes("?") ? "&" : "?"}v=2&hue=20`,
      `${real[0]}${real[0].includes("?") ? "&" : "?"}v=3&hue=-20`,
      `${real[0]}${real[0].includes("?") ? "&" : "?"}v=4&hue=40`,
    ];
    return variations;
  }, [product]);

  if (isLoading && !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-3xl bg-card/[0.04] animate-pulse" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded-lg bg-card/[0.04] animate-pulse" />
          <div className="h-6 w-1/3 rounded-lg bg-card/[0.04] animate-pulse" />
          <div className="h-24 rounded-lg bg-card/[0.04] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h1 className="text-xl font-bold">Product not found</h1>
        <Link href="/storefront/shop" className="inline-block mt-4 text-indigo-300 hover:text-indigo-200">
          ← Back to shop
        </Link>
      </div>
    );
  }

  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock < 5;
  const stockPct = Math.min(100, (stock / 20) * 100);
  const oldPrice =
    product.defaultDiscount?.mode === "percent" && product.defaultDiscount.value > 0
      ? Math.round(product.price / (1 - product.defaultDiscount.value / 100))
      : product.defaultDiscount?.mode === "amount" && product.defaultDiscount.value > 0
      ? product.price + product.defaultDiscount.value
      : undefined;
  const savePct = oldPrice ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0;

  const variantLabel = [selectedColor, selectedStorage].filter(Boolean).join(" / ");
  const displayName = variantLabel ? `${product.name} — ${variantLabel}` : product.name;

  const handleAdd = (silent = false) => {
    if (outOfStock) return;
    add({
      productId: variantLabel ? `${product.id}__${selectedColor}_${selectedStorage}` : product.id,
      name: displayName,
      price: product.price,
      emoji: product.emoji,
      imageUrl: product.imageUrl,
      maxStock: stock,
      qty,
    });
    if (!silent) toast({ title: "Added to cart", description: `${qty} × ${displayName}` });
  };

  const handleBuyNow = () => {
    handleAdd(true);
    router.push("/storefront/checkout");
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    }
  };

  const handleCompare = () => {
    const ok = toggleCompare(product.id);
    if (!ok) toast({ title: "Compare limit reached", description: "Max 4 products.", variant: "destructive" });
  };

  const reviewStats = {
    avg: 4.8,
    total: 124,
    breakdown: [
      { star: 5, count: 88 },
      { star: 4, count: 24 },
      { star: 3, count: 8 },
      { star: 2, count: 3 },
      { star: 1, count: 1 },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-4 overflow-x-auto">
        <Link href="/storefront" className="hover:text-white">Home</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href="/storefront/shop" className="hover:text-white">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link href={`/storefront/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-white truncate">
              {product.category}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-slate-500 truncate">{product.name}</span>
      </nav>

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-xs sm:text-sm text-slate-400 hover:text-white mb-4 md:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid md:grid-cols-[1.1fr_1fr] lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10">
        {/* === Gallery === */}
        <div className="md:sticky md:top-20 self-start space-y-3">
          <div
            className="group relative aspect-square rounded-3xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 grid place-items-center overflow-hidden cursor-zoom-in"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ active: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
          >
            {gallery[activeImage] ? (
              <img
                src={gallery[activeImage]}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300"
                style={
                  zoom.active
                    ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                    : undefined
                }
              />
            ) : (
              <div className="text-[10rem] sm:text-[14rem] drop-shadow-[0_20px_50px_rgba(79,70,229,0.4)]">
                {product.emoji || "📦"}
              </div>
            )}

            {/* Floating badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {savePct > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-500/90 text-white">
                  -{savePct}%
                </span>
              )}
              {product.condition && product.condition !== "New" && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-amber-500/90 text-black">
                  {product.condition}
                </span>
              )}
            </div>
            {product.brand && (
              <span className="absolute top-3 right-3 text-[10px] font-medium px-2 py-1 rounded-md bg-black/40 backdrop-blur text-slate-200 border border-white/10">
                {product.brand}
              </span>
            )}

            {/* Action rail */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
              <button
                onClick={() => toggleWishlist(product.id)}
                className={cn(
                  "h-9 w-9 grid place-items-center rounded-full backdrop-blur border border-white/10 transition",
                  wishlisted ? "bg-rose-500 text-white" : "bg-black/40 text-white hover:bg-rose-500/80",
                )}
                aria-label="Wishlist"
              >
                <Heart className={cn("h-4 w-4", wishlisted && "fill-white")} />
              </button>
              <button
                onClick={handleCompare}
                className={cn(
                  "h-9 w-9 grid place-items-center rounded-full backdrop-blur border border-white/10 transition",
                  compared ? "bg-indigo-500 text-white" : "bg-black/40 text-white hover:bg-indigo-500/80",
                )}
                aria-label="Compare"
              >
                <GitCompareArrows className="h-4 w-4" />
              </button>
              <button
                onClick={handleShare}
                className="h-9 w-9 grid place-items-center rounded-full bg-black/40 backdrop-blur border border-white/10 text-white hover:bg-card/10"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition",
                    i === activeImage ? "border-indigo-400" : "border-white/10 opacity-60 hover:opacity-100",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === Info === */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              {product.category && (
                <span className="text-indigo-300 font-medium uppercase tracking-wider">{product.category}</span>
              )}
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Sparkles className="h-3 w-3" /> Trending
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">{product.name}</h1>

            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-white font-semibold">{reviewStats.avg}</span>
                <span>({reviewStats.total} reviews)</span>
              </span>
              <span className="h-4 w-px bg-card/10" />
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>1.2k+ sold</span>
              </span>
            </div>
          </div>

          {/* Price block */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-transparent border border-white/10 p-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">{formatPrice(product.price)}</div>
              {oldPrice && (
                <>
                  <div className="text-base text-slate-500 line-through">{formatPrice(oldPrice)}</div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Save {formatPrice(oldPrice - product.price)}
                  </span>
                </>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-400">Tax inclusive • Free delivery over ৳1000</div>
          </div>

          {/* Stock urgency */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              {outOfStock ? (
                <span className="text-rose-300 font-semibold">Out of stock</span>
              ) : lowStock ? (
                <span className="text-amber-300 font-semibold inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> Only {stock} left — hurry!
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> In stock — {stock} available
                </span>
              )}
              <span className="text-slate-500">SKU: {product.sku || product.id.slice(0, 8)}</span>
            </div>
            <Progress value={outOfStock ? 0 : stockPct} className="h-1.5 bg-card/5" />
          </div>

          {/* Variant selectors */}
          {(colorOptions.length > 0 || storageOptions.length > 0) && (
            <div className="space-y-3 rounded-2xl bg-card/[0.02] border border-white/10 p-4">
              {colorOptions.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">
                    Color: <span className="text-white font-semibold">{selectedColor || "Select"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={cn(
                          "px-3 h-9 rounded-full text-xs font-medium border transition",
                          selectedColor === c
                            ? "border-indigo-400 bg-indigo-500/15 text-white"
                            : "border-white/10 text-slate-300 hover:border-white/30 hover:text-white",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {storageOptions.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">
                    Storage: <span className="text-white font-semibold">{selectedStorage || "Select"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {storageOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedStorage(s)}
                        className={cn(
                          "px-3 h-9 rounded-full text-xs font-medium border transition",
                          selectedStorage === s
                            ? "border-indigo-400 bg-indigo-500/15 text-white"
                            : "border-white/10 text-slate-300 hover:border-white/30 hover:text-white",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Qty + actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-full bg-card/5 border border-white/10">
                <button
                  className="h-11 w-11 grid place-items-center text-slate-300 hover:text-white"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-3 font-semibold tabular-nums min-w-[2ch] text-center">{qty}</span>
                <button
                  className="h-11 w-11 grid place-items-center text-slate-300 hover:text-white disabled:text-slate-600"
                  onClick={() => setQty((q) => Math.min(stock, q + 1))}
                  disabled={qty >= stock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={() => handleAdd()}
                disabled={outOfStock}
                className="flex-1 h-11 bg-card/10 hover:bg-card/15 text-white rounded-full border border-white/10"
              >
                <ShoppingBag className="h-4 w-4 mr-2" /> Add to cart
              </Button>
            </div>
            <Button
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full shadow-lg shadow-indigo-600/30 font-semibold"
            >
              <Zap className="h-4 w-4 mr-2" /> Buy now
            </Button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleWishlist(product.id)}
                className={cn(
                  "flex-1 h-10 rounded-full border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition",
                  wishlisted
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                    : "border-white/10 text-slate-300 hover:text-white hover:border-white/20",
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-rose-400")} />
                {wishlisted ? "Wishlisted" : "Wishlist"}
              </button>
              <button
                onClick={handleCompare}
                className={cn(
                  "flex-1 h-10 rounded-full border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition",
                  compared
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                    : "border-white/10 text-slate-300 hover:text-white hover:border-white/20",
                )}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                {compared ? "Comparing" : "Compare"}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 h-10 rounded-full border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>

          {/* Quick specs */}
          {(product.brand || product.model || product.color || product.storage || product.ram || product.warrantyMonths) && (
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm pt-2">
              {product.brand && <Spec k="Brand" v={product.brand} />}
              {product.model && <Spec k="Model" v={product.model} />}
              {product.color && <Spec k="Color" v={product.color} />}
              {product.storage && <Spec k="Storage" v={product.storage} />}
              {product.ram && <Spec k="RAM" v={product.ram} />}
              {product.warrantyMonths && <Spec k="Warranty" v={`${product.warrantyMonths} months`} />}
            </div>
          )}

          {/* Trust grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {[
              { icon: Truck, t: "Fast delivery", s: "1-3 days" },
              { icon: ShieldCheck, t: "Genuine", s: "100% authentic" },
              { icon: RotateCcw, t: "Easy return", s: "7-day policy" },
              { icon: CreditCard, t: "Secure pay", s: "All methods" },
            ].map((x) => (
              <div key={x.t} className="rounded-xl bg-card/[0.03] border border-white/10 p-3">
                <x.icon className="h-4 w-4 text-indigo-300 mb-1.5" />
                <div className="text-xs font-semibold text-white">{x.t}</div>
                <div className="text-[10px] text-slate-400">{x.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Tabs === */}
      <section className="mt-12 sm:mt-16">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="bg-card/[0.04] border border-white/10 rounded-full p-1 h-auto flex flex-wrap gap-1">
            <TabsTrigger value="description" className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 px-4 py-2 text-xs sm:text-sm">
              Description
            </TabsTrigger>
            <TabsTrigger value="specs" className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 px-4 py-2 text-xs sm:text-sm">
              Specifications
            </TabsTrigger>
            <TabsTrigger value="shipping" className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 px-4 py-2 text-xs sm:text-sm">
              Shipping
            </TabsTrigger>
            <TabsTrigger value="returns" className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 px-4 py-2 text-xs sm:text-sm">
              Return Policy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="rounded-2xl bg-card/[0.03] border border-white/10 p-5 sm:p-6 text-slate-300 leading-relaxed text-sm sm:text-base">
              {product.description ? (
                <p className="whitespace-pre-line">{product.description}</p>
              ) : (
                <div className="space-y-3">
                  <p>
                    <span className="text-white font-semibold">{product.name}</span> — a premium choice
                    {product.brand ? ` from ${product.brand}` : ""}, crafted for everyday excellence.
                    Built with quality materials and modern design to deliver a reliable experience.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 pt-2">
                    {[
                      "Premium build quality",
                      "Modern, ergonomic design",
                      "Trusted seller — verified stock",
                      "Backed by our customer care",
                    ].map((x) => (
                      <li key={x} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="mt-6">
            <div className="rounded-2xl bg-card/[0.03] border border-white/10 overflow-hidden">
              <dl className="divide-y divide-white/5">
                {[
                  ["Brand", product.brand],
                  ["Model", product.model],
                  ["Category", product.category],
                  ["Color", product.color],
                  ["Storage", product.storage],
                  ["RAM", product.ram],
                  ["Condition", product.condition],
                  ["Warranty", product.warrantyMonths ? `${product.warrantyMonths} months` : undefined],
                  ["SKU", product.sku],
                  ["Barcode", product.barcode],
                ]
                  .filter(([, v]) => Boolean(v))
                  .map(([k, v]) => (
                    <div key={k as string} className="grid grid-cols-3 gap-2 px-4 sm:px-5 py-3 text-sm">
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="col-span-2 text-white font-medium">{v as string}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Truck, t: "Inside Dhaka", s: "Same / next day delivery. ৳60 charge." },
                { icon: Package, t: "Outside Dhaka", s: "2-3 business days. ৳120 charge." },
                { icon: ShieldCheck, t: "Secure packaging", s: "Every order is sealed & quality-checked." },
              ].map((x) => (
                <div key={x.t} className="rounded-2xl bg-card/[0.03] border border-white/10 p-5">
                  <x.icon className="h-5 w-5 text-indigo-300 mb-2" />
                  <div className="font-semibold text-white">{x.t}</div>
                  <div className="text-sm text-slate-400 mt-1">{x.s}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="returns" className="mt-6">
            <div className="rounded-2xl bg-card/[0.03] border border-white/10 p-5 sm:p-6 space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-white font-semibold">
                <RotateCcw className="h-5 w-5 text-indigo-300" /> 7-Day Easy Return
              </div>
              <ul className="space-y-2">
                {[
                  "Return within 7 days of delivery if the product is defective or not as described.",
                  "Item must be unused, in original packaging with all accessories & tags.",
                  "Refund is processed within 3-5 business days after inspection.",
                  "Warranty claims follow the manufacturer's policy.",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* === Customer Reviews === */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Customer Reviews</h2>
          <Button variant="ghost" className="border border-white/10 rounded-full text-white hover:bg-card/5 text-xs">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Write a review
          </Button>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          {/* Summary */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-transparent border border-white/10 p-5 text-center">
            <div className="text-5xl font-extrabold text-white">{reviewStats.avg}</div>
            <div className="flex justify-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-4 w-4", i < Math.round(reviewStats.avg) ? "fill-amber-400 text-amber-400" : "text-slate-600")} />
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-1">Based on {reviewStats.total} reviews</div>

            <div className="mt-4 space-y-1.5">
              {reviewStats.breakdown.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-slate-400 text-right">{b.star}★</span>
                  <Progress value={(b.count / reviewStats.total) * 100} className="h-1.5 flex-1 bg-card/5" />
                  <span className="w-8 text-slate-400 tabular-nums">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample reviews */}
          <div className="space-y-3">
            {[
              { name: "Rakib H.", rating: 5, date: "2 weeks ago", text: "Excellent product, fast delivery. Build quality is top-notch. Highly recommended!", helpful: 12 },
              { name: "Sadia A.", rating: 5, date: "1 month ago", text: "Genuine product, exactly as described. Packaging was secure and arrived in perfect condition.", helpful: 8 },
              { name: "Tanvir K.", rating: 4, date: "1 month ago", text: "Good value for money. Works as expected. Star less only for slightly delayed shipping.", helpful: 3 },
            ].map((r, i) => (
              <article key={i} className="rounded-2xl bg-card/[0.03] border border-white/10 p-4">
                <header className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-semibold text-sm">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
                        {r.name}
                        <BadgeVerified />
                      </div>
                      <div className="text-[10px] text-slate-500">{r.date}</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={cn("h-3.5 w-3.5", j < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-600")} />
                    ))}
                  </div>
                </header>
                <p className="text-sm text-slate-300 leading-relaxed">{r.text}</p>
                <button className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white">
                  <ThumbsUp className="h-3 w-3" /> Helpful ({r.helpful})
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* === Related === */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-4">You may also like</h2>
          <ProductGrid products={related} allProducts={related} />
        </section>
      )}
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-card/[0.03] border border-white/5 px-3 py-2">
      <div className="text-[10px] sm:text-xs text-slate-500">{k}</div>
      <div className="text-sm font-medium text-white truncate">{v}</div>
    </div>
  );
}

function BadgeVerified() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
      <Check className="h-2.5 w-2.5" /> Verified
    </span>
  );
}
