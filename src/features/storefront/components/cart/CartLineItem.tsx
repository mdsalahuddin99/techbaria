import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { formatPrice } from "../../lib/formatPrice";
import { useCartStore } from "../../store/useCartStore";
import type { CartLine } from "../../types";

interface Props {
  line: CartLine;
}

export function CartLineItem({ line }: Props) {
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="flex gap-3 p-3 rounded-2xl bg-card/[0.04] border border-white/10">
      <Link
        href={`/p/${encodeURIComponent((line as any).slug || line.productId)}`}
        className="shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-card/5 border border-white/10 grid place-items-center overflow-hidden"
      >
        {line.imageUrl ? (
          <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl sm:text-3xl">{line.emoji || "📦"}</span>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/p/${encodeURIComponent((line as any).slug || line.productId)}`}
          className="text-sm font-semibold line-clamp-2 hover:text-indigo-300"
        >
          {line.name}
        </Link>
        <div className="text-xs text-slate-400 mt-0.5">{formatPrice(line.price)} × {line.qty}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="inline-flex items-center rounded-full bg-card/5 border border-white/10">
            <button
              className="h-7 w-7 grid place-items-center text-slate-300 hover:text-white"
              onClick={() => setQty(line.productId, line.qty - 1)}
              aria-label="Decrease"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-sm font-semibold tabular-nums">{line.qty}</span>
            <button
              className="h-7 w-7 grid place-items-center text-slate-300 hover:text-white disabled:text-slate-600"
              onClick={() => setQty(line.productId, line.qty + 1)}
              disabled={line.qty >= line.maxStock}
              aria-label="Increase"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            className="ml-auto text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1"
            onClick={() => remove(line.productId)}
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-white">{formatPrice(line.price * line.qty)}</div>
      </div>
    </div>
  );
}
