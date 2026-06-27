import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Mic, X, TrendingUp, Clock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStorefrontProducts } from "../../hooks/useStorefrontProducts";
import { useRecentSearchesStore } from "../../store/useRecentSearchesStore";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";
import { formatPrice } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";
import { categoryName } from "@/shared/lib/categoryName";

interface Props {
  className?: string;
  variant?: "header" | "hero";
}

/** AI-style search: instant suggestions, recent terms, trending categories, voice input. */
export function SmartSearch({ className = "", variant = "header" }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { products } = useStorefrontProducts({ search: q, sort: "popular" });
  const categories = useStorefrontCategories();
  const recent = useRecentSearchesStore((s) => s.items);
  const pushRecent = useRecentSearchesStore((s) => s.push);
  const clearRecent = useRecentSearchesStore((s) => s.clear);

  const suggestions = useMemo(() => products.slice(0, 6), [products]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const submit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    pushRecent(t);
    setOpen(false);
    setQ("");
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const startVoice = () => {
    // Web Speech API — graceful no-op when unsupported.
    type SRInst = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    type SRCtor = new () => SRInst;
    const w = window as unknown as {
      webkitSpeechRecognition?: SRCtor;
      SpeechRecognition?: SRCtor;
    };
    const Ctor = w.webkitSpeechRecognition || w.SpeechRecognition;
    if (!Ctor) {
      alert("আপনার ব্রাউজার voice search সাপোর্ট করে না।");
      return;
    }
    const rec = new Ctor();
    rec.lang = "bn-BD";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setQ(text);
      submit(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const sizeCls =
    variant === "hero"
      ? "h-14 sm:h-16 text-base pl-14 pr-28 rounded-2xl"
      : "h-10 sm:h-11 text-sm pl-10 pr-20 rounded-full";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="relative"
      >
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${
            variant === "hero" ? "h-5 w-5 left-5" : "h-4 w-4"
          }`}
        />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          type="search"
          placeholder={variant === "hero" ? "iPhone 15 Pro, RTX 4090, Hikvision CCTV…" : "Search products…"}
          className={`w-full ${sizeCls} bg-white border border-slate-200 shadow-sm placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition`}
        />
        <div
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 ${
            variant === "hero" ? "right-3" : ""
          }`}
        >
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={startVoice}
            className={`p-1.5 rounded-full transition ${
              listening
                ? "bg-rose-50 text-rose-500 animate-pulse"
                : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
            }`}
            aria-label="Voice search"
          >
            <Mic className="h-4 w-4" />
          </button>
          {variant === "hero" && (
            <button
              type="submit"
              className="ml-1 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" /> Search
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-white backdrop-blur-xl border border-slate-200 shadow-[0_10px_40px_rgb(0,0,0,0.08)] overflow-hidden animate-fade-in">
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {q.trim() && suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mb-1">
                  Suggestions
                </div>
                {suggestions.map((p) => (
                  <Link
                    key={p.id}
                    href={`/p/${encodeURIComponent(p.slug || p.id)}`}
                    onClick={() => {
                      pushRecent(q);
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center overflow-hidden shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">{p.emoji || "📦"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{productDisplayName(p)}</div>
                      <div className="text-[11px] text-slate-500">{categoryName(p.category as any)}</div>
                    </div>
                    <div className="text-sm font-semibold text-indigo-600">{formatPrice(p.price)}</div>
                  </Link>
                ))}
              </div>
            )}

            {!q.trim() && recent.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Recent
                  </span>
                  <button
                    onClick={clearRecent}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => submit(r)}
                      className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 hover:bg-slate-200"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!q.trim() && categories.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Trending
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {categories.slice(0, 6).map((c) => (
                    <Link
                      key={c.value}
                      href={`/shop/${encodeURIComponent(c.value)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-sm text-slate-700 hover:text-indigo-600"
                    >
                      <c.icon className="h-4 w-4 text-indigo-500" />
                      <span className="truncate">{c.label}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{c.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {q.trim() && suggestions.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">
                "{q}" এর জন্য কোনো suggestion নেই
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
