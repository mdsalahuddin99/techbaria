import { formatPrice } from "../../lib/formatPrice";

interface Props {
  subtotal: number;
  shipping?: number;
  discount?: number;
  total: number;
}

export function CartSummary({ subtotal, shipping = 0, discount = 0, total }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 text-sm text-slate-600">
      <Row label="Subtotal" value={formatPrice(subtotal)} />
      <Row label="Shipping" value={shipping === 0 ? "—" : formatPrice(shipping)} />
      {discount > 0 && <Row label="Discount" value={`-${formatPrice(discount)}`} accent="text-emerald-600" />}
      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
        <span className="text-base font-semibold text-slate-900">Total</span>
        <span className="text-lg font-extrabold text-slate-900">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-slate-500">
      <span>{label}</span>
      <span className={accent ?? "text-[#1E3A5F] font-medium"}>{value}</span>
    </div>
  );
}
