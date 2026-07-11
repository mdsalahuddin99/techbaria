import Link from "next/link";
import Image from "next/image";
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
    <div className="flex gap-3 p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
      <Link
        href={`/p/${encodeURIComponent((line as any).slug || line.productId)}`}
        className="relative shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid place-items-center overflow-hidden"
      >
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt={line.name} fill sizes="80px" className="object-cover" />
        ) : (
          <span className="text-2xl sm:text-3xl">{line.emoji || "📦"}</span>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/p/${encodeURIComponent((line as any).slug || line.productId)}`}
          className="text-sm font-semibold line-clamp-2 hover:text-[#16A34A] text-[#1E3A5F]"
        >
          {line.name}
        </Link>
        <div className="text-xs text-slate-500 mt-0.5">{formatPrice(line.price)} × {line.qty}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="inline-flex items-center rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
            <button
              className="h-7 w-7 grid place-items-center text-slate-500 hover:text-[#1E3A5F]"
              onClick={() => setQty(line.productId, line.qty - 1)}
              aria-label="Decrease"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-sm font-semibold tabular-nums text-[#1E3A5F]">{line.qty}</span>
            <button
              className="h-7 w-7 grid place-items-center text-slate-500 hover:text-[#1E3A5F] disabled:text-slate-300"
              onClick={() => setQty(line.productId, line.qty + 1)}
              disabled={line.qty >= line.maxStock}
              aria-label="Increase"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            className="ml-auto text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1 font-medium"
            onClick={() => remove(line.productId)}
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-[#1E3A5F]">{formatPrice(line.price * line.qty)}</div>
      </div>
    </div>
  );
}
