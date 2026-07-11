import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { formatDateTime } from "@/shared/lib/format";
import type { StockAdjustment } from "@/shared/lib/types";

interface AdjustmentsHistoryProps {
  adjustments: StockAdjustment[];
}

/** Audit-trail table for inventory adjustments. */
export function AdjustmentsHistory({ adjustments }: AdjustmentsHistoryProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Before → After</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(a.date)}</TableCell>
                <TableCell className="font-medium">{a.productName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    a.type === "Add" ? "border-accent text-accent" :
                    a.type === "Remove" ? "border-destructive text-destructive" :
                    "border-primary text-primary"
                  }>{a.type}</Badge>
                </TableCell>
                <TableCell className="text-right">{a.qty}</TableCell>
                <TableCell className="text-right text-sm">{a.beforeStock} → <span className="font-semibold">{a.afterStock}</span></TableCell>
                <TableCell className="text-sm">{a.reason}</TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">{a.reference || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.note || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.user}</TableCell>
              </TableRow>
            ))}
            {adjustments.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No adjustments yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
