import { formatPrice } from "../../lib/formatPrice";

interface Props {
  subtotal: number;
  shipping?: number;
  discount?: number;
  total: number;
}

export function CartSummary({ subtotal, shipping = 0, discount = 0, total }: Props) {
  return (
    <div className="rounded-2xl bg-card/[0.04] border border-white/10 p-4 space-y-2 text-sm">
      <Row label="Subtotal" value={formatPrice(subtotal)} />
      <Row label="Shipping" value={shipping === 0 ? "—" : formatPrice(shipping)} />
      {discount > 0 && <Row label="Discount" value={`-${formatPrice(discount)}`} accent="text-emerald-300" />}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between">
        <span className="text-base font-semibold">Total</span>
        <span className="text-lg font-extrabold text-white">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span>{label}</span>
      <span className={accent ?? "text-white font-medium"}>{value}</span>
    </div>
  );
}
