import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import { useCompareStore } from "../../store/useCompareStore";
import { useStorefrontProducts } from "../../hooks/useStorefrontProducts";
import { formatPrice } from "../../lib/formatPrice";

/** Floating compare tray — appears whenever there are items in the compare set. */
export function CompareTray() {
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const { all = [] } = useStorefrontProducts();

  if (ids.length === 0) return null;
  const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95vw] max-w-2xl">
      <div className="rounded-2xl bg-[#0b0b22]/95 backdrop-blur-xl border border-indigo-400/30 shadow-2xl shadow-indigo-900/40 p-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-indigo-200 text-xs font-semibold shrink-0">
          <GitCompareArrows className="h-4 w-4" />
          <span className="hidden sm:inline">Compare</span>
        </div>
        <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
          {items.map((p) => (
            <div key={p!.id} className="relative shrink-0 h-12 w-12 rounded-lg bg-card/5 border border-white/10 overflow-hidden">
              {p!.imageUrl ? (
                <img src={p!.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-xl">{p!.emoji || "📦"}</div>
              )}
              <button
                onClick={() => remove(p!.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white grid place-items-center"
                aria-label="Remove"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="hidden sm:block text-xs text-slate-400">
          {items.length}/4 items · {formatPrice(items.reduce((s, p) => s + (p?.price ?? 0), 0))}
        </div>
        <button
          onClick={clear}
          className="text-[11px] text-slate-400 hover:text-rose-300 shrink-0"
        >
          Clear
        </button>
        <Link
          href="/compare"
          className="shrink-0 h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold grid place-items-center"
        >
          Compare ({items.length})
        </Link>
      </div>
    </div>
  );
}
