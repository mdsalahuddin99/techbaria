import { Boxes, AlertTriangle, PackageX } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";
import { useLocale } from "@/features/i18n";
import { cn } from "@/shared/lib/utils";

interface InventoryStatsCardsProps {
  stockValue: number;
  lowCount: number;
  outCount: number;
}

export function InventoryStatsCards({
  stockValue,
  lowCount,
  outCount,
}: InventoryStatsCardsProps) {
  const locale = useLocale();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 h-full">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 shadow-lg h-full flex flex-col justify-center">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 p-3 opacity-20 transition-transform hover:scale-110">
          <Boxes className="h-16 w-16 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-100 mb-1">
            Total Stock Value
          </p>
          <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
            {formatCurrency(stockValue, locale)}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 shadow-lg h-full flex flex-col justify-center">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 p-3 opacity-20 transition-transform hover:scale-110">
          <AlertTriangle className="h-16 w-16 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-orange-100 mb-1">
            Low Stock Alerts
          </p>
          <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
            {lowCount} <span className="text-lg text-white/80 font-bold ml-1">items</span>
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-4 shadow-lg h-full flex flex-col justify-center">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 p-3 opacity-20 transition-transform hover:scale-110">
          <PackageX className="h-16 w-16 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-rose-100 mb-1">
            Out of Stock
          </p>
          <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
            {outCount} <span className="text-lg text-white/80 font-bold ml-1">items</span>
          </p>
        </div>
      </div>
    </div>
  );
}
