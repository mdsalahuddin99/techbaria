import type { SortKey } from "../../types";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low → High" },
  { value: "price_high", label: "Price: High → Low" },
];

interface Props {
  value: SortKey;
  onChange: (v: SortKey) => void;
}

export function SortMenu({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="h-9 px-3 pr-8 rounded-full bg-card/5 border border-white/10 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-400/60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0d0d24]">
          {o.label}
        </option>
      ))}
    </select>
  );
}
