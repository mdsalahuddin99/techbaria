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
    <div className="grid grid-cols-3 gap-2 sm:gap-4 h-full">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 sm:p-3 shadow-lg h-full flex flex-col justify-center">
        <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-0 p-3 opacity-20 transition-transform hover:scale-110">
          <Boxes className="h-12 w-12 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest text-indigo-100 mb-0.5 sm:mb-1 truncate" title="Total Stock Value">
            Stock Value
          </p>
          <p className="text-sm sm:text-2xl font-extrabold text-white tracking-tight tabular-nums truncate">
            {formatCurrency(stockValue, locale)}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-2 sm:p-3 shadow-lg h-full flex flex-col justify-center">
        <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-0 p-3 opacity-20 transition-transform hover:scale-110">
          <AlertTriangle className="h-12 w-12 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest text-orange-100 mb-0.5 sm:mb-1 truncate" title="Low Stock Alerts">
            Low Stock
          </p>
          <p className="text-sm sm:text-2xl font-extrabold text-white tracking-tight tabular-nums truncate">
            {lowCount} <span className="text-[10px] sm:text-base text-white/80 font-bold ml-0.5 sm:ml-1">items</span>
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-2 sm:p-3 shadow-lg h-full flex flex-col justify-center">
        <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-0 p-3 opacity-20 transition-transform hover:scale-110">
          <PackageX className="h-12 w-12 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest text-rose-100 mb-0.5 sm:mb-1 truncate" title="Out of Stock">
            Out of Stock
          </p>
          <p className="text-sm sm:text-2xl font-extrabold text-white tracking-tight tabular-nums truncate">
            {outCount} <span className="text-[10px] sm:text-base text-white/80 font-bold ml-0.5 sm:ml-1">items</span>
          </p>
        </div>
      </div>
    </div>
  );
}
