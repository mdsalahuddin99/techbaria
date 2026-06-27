"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Progress } from "@/shared/ui/progress";
import { useCartStore, formatPrice, useSeo } from "@/features/storefront";
import { ProductGrid } from "@/features/storefront/components/product/ProductGrid";
import { useWishlistStore } from "@/features/storefront/store/useWishlistStore";
import { useCompareStore } from "@/features/storefront/store/useCompareStore";
import { toast } from "@/shared/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import type { StorefrontProduct } from "@/features/storefront/types";
import { publicStock } from "@/features/storefront/hooks/useStorefrontProducts";

interface Props {
  product: StorefrontProduct;
  related: StorefrontProduct[];
}

export function ProductDetailClient({ product, related }: Props) {
  const router = useRouter();
  const stock = useMemo(() => publicStock(product, []), [product]);
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= 5;
  const stockPct = useMemo(() => Math.min(100, Math.round((stock / 20) * 100)), [stock]);
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

  const wishlisted = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const compared = useCompareStore((s) => s.ids.includes(product.id));
  const toggleCompare = useCompareStore((s) => s.toggle);

  useSeo({
    title: `${product.name} — AmarShop`,
    description: `${product.name}${product.brand ? ` by ${product.brand}` : ""} — ${formatPrice(product.price)}.`,
  });

  // Real gallery from product.images array
  const gallery = useMemo(() => {
    if (product.images && product.images.length > 0) return product.images;
    if (product.imageUrl) return [product.imageUrl];
    return [];
  }, [product]);

  // Discount / old-price derived from product.defaultDiscount
  const oldPrice = useMemo(() => {
    const d = product.defaultDiscount;
    if (!d) return null;
    if (d.mode === "percent") return Math.round(product.price / (1 - d.value / 100));
    if (d.mode === "amount") return product.price + d.value;
    return null;
  }, [product]);

  const savePct = useMemo(() => {
    if (!oldPrice) return 0;
    return Math.round(((oldPrice - product.price) / oldPrice) * 100);
  }, [oldPrice, product.price]);

  // Reviews state — loaded from API
  type ReviewItem = { id: string; reviewerName: string; rating: number; comment: string; createdAt: string };
  type ReviewStats = { avg: number; total: number; breakdown: { star: number; count: number }[] };
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ avg: 0, total: 0, breakdown: [] });
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Review form state
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 0, comment: "", submitting: false, submitted: false, error: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"specification" | "description" | "reviews">("specification");

  const slugOrId = product.slug ?? product.id;

  const loadReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const res = await fetch(`/api/storefront/products/${slugOrId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviewStats(data.stats);
        setReviews(data.reviews);
      }
    } catch {
      // silent fail
    } finally {
      setReviewsLoading(false);
    }
  }, [slugOrId]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name.trim()) { setReviewForm((f) => ({ ...f, error: "নাম দিন" })); return; }
    if (!reviewForm.rating) { setReviewForm((f) => ({ ...f, error: "রেটিং দিন" })); return; }
    if (!reviewForm.comment.trim()) { setReviewForm((f) => ({ ...f, error: "মন্তব্য লিখুন" })); return; }
    setReviewForm((f) => ({ ...f, submitting: true, error: "" }));
    try {
      const res = await fetch(`/api/storefront/products/${slugOrId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerName: reviewForm.name, rating: reviewForm.rating, comment: reviewForm.comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setReviewForm({ name: "", rating: 0, comment: "", submitting: false, submitted: true, error: "" });
      setShowReviewForm(false);
      toast({ title: "✅ রিভিউ জমা হয়েছে!", description: "অনুমোদনের পরে দেখা যাবে।" });
    } catch (err: any) {
      setReviewForm((f) => ({ ...f, submitting: false, error: err.message ?? "Error" }));
    }
  };

  const handleAdd = () => {
    add({ ...product, productId: product.id, maxStock: product.stock, qty });
    toast({ title: "🛒 Added to cart", description: `${qty}× ${product.name}` });
  };

  const handleBuyNow = () => {
    add({ ...product, productId: product.id, maxStock: product.stock, qty });
    router.push("/storefront/checkout");
  };

  const handleCompare = () => {
    toggleCompare(product.id);
    toast({
      title: compared ? "Removed from compare" : "Added to compare",
      description: compared ? undefined : "Go to compare page to view.",
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "🔗 Link copied!", description: "Share it anywhere." });
    }
  };

  return (
    <div className="bg-[#F2F4F8] min-h-screen pb-20 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-4 overflow-x-auto bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
          <Link href="/" className="hover:text-indigo-600 font-medium">Home</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <Link href="/shop" className="hover:text-indigo-600 font-medium">Shop</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <Link href={`/storefront/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-indigo-600 font-medium whitespace-nowrap">
                {product.category}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate">{product.name}</span>
        </nav>

        {/* Main Product Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-5 md:hidden bg-slate-50 px-3 py-1.5 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="grid md:grid-cols-[45%_1fr] gap-8 lg:gap-12">
            {/* === Gallery === */}
            <div className="md:sticky md:top-24 self-start space-y-4">
              <div
                className="group relative aspect-square rounded-xl bg-[#F8F9FA] border border-slate-100 flex items-center justify-center overflow-hidden cursor-zoom-in"
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
                    className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-300 mix-blend-multiply"
                    style={
                      zoom.active
                        ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                        : undefined
                    }
                  />
                ) : (
                  <div className="text-[8rem] sm:text-[12rem] drop-shadow-sm opacity-50">
                    {product.emoji || "📦"}
                  </div>
                )}

                {/* Floating badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {savePct > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-rose-500 text-white shadow-sm tracking-wide">
                      -{savePct}%
                    </span>
                  )}
                  {product.condition && product.condition !== "New" && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-400 text-amber-900 shadow-sm uppercase tracking-wider">
                      {product.condition}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                  {gallery.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={cn(
                        "h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 bg-white transition flex items-center justify-center",
                        i === activeImage ? "border-indigo-600 shadow-sm" : "border-slate-100 hover:border-slate-300",
                      )}
                    >
                      <img src={src} alt="" className="h-full w-full object-contain mix-blend-multiply p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>

        {/* === Info === */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-snug">{product.name}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">Price: {formatPrice(product.price)}</span>
              {product.brand && (
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">Brand: {product.brand}</span>
              )}
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">SKU: {product.sku || product.id.slice(0, 8)}</span>
              {outOfStock ? (
                <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-medium">Out of stock</span>
              ) : (
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">In Stock</span>
              )}
            </div>
          </div>

          {/* Key Features (Specs) */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Key Features</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {product.model && <li><span className="font-medium text-slate-800">Model:</span> {product.model}</li>}
              {product.color && <li><span className="font-medium text-slate-800">Color:</span> {product.color}</li>}
              {product.storage && <li><span className="font-medium text-slate-800">Storage:</span> {product.storage}</li>}
              {product.ram && <li><span className="font-medium text-slate-800">RAM:</span> {product.ram}</li>}
              {product.warrantyMonths ? (
                <li><span className="font-medium text-slate-800">Warranty:</span> {product.warrantyMonths} Months</li>
              ) : null}
            </ul>
            <a href="#specification" className="inline-block mt-3 text-indigo-600 hover:underline text-sm font-medium">View More Info</a>
          </div>

          {/* Buy Box */}
          <div className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
            {/* Price block */}
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-medium">Payment Options</div>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="text-4xl font-extrabold text-[#EF4A23]">{formatPrice(product.price)}</div>
                {oldPrice && (
                  <div className="text-base text-slate-500 line-through mb-1">{formatPrice(oldPrice)}</div>
                )}
              </div>
            </div>

            {/* Qty + actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="inline-flex items-center justify-between rounded-md bg-white border border-slate-200 shadow-sm h-12 w-full sm:w-32 px-1">
                <button
                  className="h-10 w-10 grid place-items-center text-slate-500 hover:text-slate-900 transition-colors"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-2 font-bold text-slate-900 tabular-nums text-center text-base">{qty}</span>
                <button
                  className="h-10 w-10 grid place-items-center text-slate-500 hover:text-slate-900 disabled:text-slate-300 transition-colors"
                  onClick={() => setQty((q) => Math.max(stock, q + 1))}
                  disabled={qty >= stock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={handleBuyNow}
                disabled={outOfStock}
                className="flex-1 h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md shadow-md font-bold text-base transition-all"
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* Variant selectors */}
          {(colorOptions.length > 0 || storageOptions.length > 0) && (
            <div className="space-y-4 pt-2">
              {colorOptions.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2 font-medium">Color: <span className="text-slate-900 font-bold">{selectedColor || "Select"}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={cn(
                          "px-4 h-9 rounded text-sm font-medium border transition",
                          selectedColor === c ? "border-[#EF4A23] bg-orange-50 text-[#EF4A23]" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* === Tabbed Sections === */}
      <div className="mt-12">
        <div className="flex overflow-x-auto border-b border-slate-200 mb-8 scrollbar-hide">
          <button
            onClick={() => setActiveTab("specification")}
            className={cn(
              "px-6 py-4 font-semibold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap",
              activeTab === "specification" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            Specification
          </button>
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "px-6 py-4 font-semibold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap",
              activeTab === "description" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "px-6 py-4 font-semibold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap",
              activeTab === "reviews" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            Customer Reviews
          </button>
        </div>

        {/* Specifications Section */}
        {activeTab === "specification" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-50 border-b border-slate-100 px-5 sm:px-8 py-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Specification</h2>
            </div>
            <div className="p-5 sm:p-8">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-200">
                    {[
                      { label: "Brand", value: product.brand },
                      { label: "Model", value: product.model },
                      { label: "Category", value: product.category },
                      { label: "Color", value: product.color },
                      { label: "Storage", value: product.storage },
                      { label: "RAM", value: product.ram },
                      { label: "Condition", value: product.condition },
                      { label: "Warranty", value: product.warrantyMonths ? `${product.warrantyMonths} months` : null },
                      { label: "Reference No.", value: product.sku },
                    ].map((item, i) => {
                      if (!item.value) return null;
                      return (
                        <tr key={item.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-4 py-3 font-medium text-slate-600 w-1/3 sm:w-1/4 border-r border-slate-200">{item.label}</td>
                          <td className="px-4 py-3 text-slate-900">{String(item.value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* Description Section */}
        {activeTab === "description" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-50 border-b border-slate-100 px-5 sm:px-8 py-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Description</h2>
            </div>
            <div className="p-5 sm:p-8 text-slate-700 leading-relaxed text-sm sm:text-base">
              {product.description ? (
                <div className="prose prose-sm sm:prose-base max-w-none text-slate-700">
                  <p className="whitespace-pre-line">{product.description}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>
                    <span className="text-slate-900 font-bold">{product.name}</span> is a premium choice
                    {product.brand ? ` from ${product.brand}` : ""}, crafted for everyday excellence.
                    Built with quality materials and modern design to deliver a reliable experience.
                  </p>
                  <ul className="space-y-2 pt-2">
                    {[
                      "Premium build quality and finish",
                      "Modern, ergonomic design for everyday use",
                      "Trusted seller with verified stock",
                      "Backed by our dedicated customer care team",
                    ].map((x) => (
                      <li key={x} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === Customer Reviews === */}
        {activeTab === "reviews" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-slate-50 border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Customer Reviews</h2>
            <Button
              variant="outline"
              className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 text-sm shadow-sm h-9"
              onClick={() => setShowReviewForm((v) => !v)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showReviewForm ? "Cancel" : "Write a Review"}
            </Button>
          </div>

          <div className="p-5 sm:p-8">
            {/* Write Review Form */}
            {showReviewForm && (
              <form
                onSubmit={handleReviewSubmit}
                className="mb-8 rounded-xl bg-slate-50 border border-slate-200 p-5 sm:p-6 space-y-5"
              >
                <h3 className="font-semibold text-slate-800">Write your review</h3>
                
                {/* Star Rating Picker */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Rating *</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "h-8 w-8 transition-colors",
                            s <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Your Name *</label>
                  <input
                    type="text"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Rahul H."
                    maxLength={100}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Review *</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="How was the product?"
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
                  />
                </div>

                {reviewForm.error && (
                  <p className="text-sm text-rose-600 font-medium">{reviewForm.error}</p>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={reviewForm.submitting}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg h-11 px-8 text-sm font-bold shadow-sm w-full sm:w-auto"
                  >
                    {reviewForm.submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Review
                  </Button>
                  <p className="text-xs text-slate-500 mt-3 text-center sm:text-left">Reviews are published after admin approval.</p>
                </div>
              </form>
            )}

            {reviewsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3 text-indigo-500" /> 
                <span className="text-sm font-medium">Loading reviews...</span>
              </div>
            ) : reviewStats.total === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-50 mb-4">
                  <Star className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-700 text-lg">No reviews yet</p>
                <p className="text-sm mt-1">Be the first to review this product!</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[300px_1fr] gap-8">
                {/* Summary */}
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center self-start">
                  <div className="text-6xl font-extrabold text-slate-900">{reviewStats.avg}</div>
                  <div className="flex justify-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-5 w-5", i < Math.round(reviewStats.avg) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                    ))}
                  </div>
                  <div className="text-sm font-medium text-slate-500 mt-2">Based on {reviewStats.total} reviews</div>

                  <div className="mt-6 space-y-2">
                    {reviewStats.breakdown.map((b) => (
                      <div key={b.star} className="flex items-center gap-3 text-sm">
                        <span className="w-8 font-medium text-slate-600 text-right">{b.star} ★</span>
                        <Progress value={reviewStats.total > 0 ? (b.count / reviewStats.total) * 100 : 0} className="h-2 flex-1 bg-slate-200" />
                        <span className="w-8 font-medium text-slate-600 tabular-nums text-left">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real reviews */}
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <article key={r.id} className="rounded-xl bg-white shadow-sm border border-slate-100 p-5">
                      <header className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {r.reviewerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {r.reviewerName}
                              <BadgeVerified />
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={cn("h-4 w-4", j < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                          ))}
                        </div>
                      </header>
                      <p className="text-sm text-slate-700 leading-relaxed pl-13">{r.comment}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* === Related === */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">You May Also Like</h2>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          <ProductGrid products={related} allProducts={related} loading={false} />
        </section>
      )}

      {/* === Mobile Sticky Action Bar === */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden z-50 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-slate-500 truncate">{product.name}</div>
          <div className="font-bold text-[#EF4A23]">{formatPrice(product.price)}</div>
        </div>
        <Button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg h-11 px-6 font-bold shadow-md"
        >
          Buy Now
        </Button>
      </div>
    </div>
  </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-3 py-2">
      <div className="text-[10px] sm:text-xs text-slate-500">{k}</div>
      <div className="text-sm font-medium text-slate-900 truncate">{v}</div>
    </div>
  );
}

function BadgeVerified() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Check className="h-2.5 w-2.5" /> Verified
    </span>
  );
}
