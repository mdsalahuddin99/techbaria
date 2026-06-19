import { Card } from "@/shared/ui/card";
import { Boxes, AlertTriangle, PackageX } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";
import { useLocale } from "@/features/i18n";

interface InventoryStatsCardsProps {
  stockValue: number;
  lowCount: number;
  outCount: number;
}

/** Three KPI cards shown above the inventory tabs. */
export function InventoryStatsCards({
  stockValue,
  lowCount,
  outCount,
}: InventoryStatsCardsProps) {
  const locale = useLocale();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <Boxes className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stock Value (cost)</p>
            <p className="text-2xl font-bold">{formatCurrency(stockValue, locale)}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 grid place-items-center">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
            <p className="text-2xl font-bold text-warning">{lowCount}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 grid place-items-center">
            <PackageX className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
            <p className="text-2xl font-bold text-destructive">{outCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
