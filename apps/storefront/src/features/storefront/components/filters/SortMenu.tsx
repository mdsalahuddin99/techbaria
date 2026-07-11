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
      className="h-8 w-[110px] sm:w-auto text-ellipsis px-2.5 pr-7 rounded-md bg-white border border-slate-200 text-[11px] sm:text-xs text-slate-700 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value} className="text-[11px] sm:text-xs">
          {o.label}
        </option>
      ))}
    </select>
  );
}
