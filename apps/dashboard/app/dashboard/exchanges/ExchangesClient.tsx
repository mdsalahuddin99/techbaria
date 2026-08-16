"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, FileText } from "lucide-react";
import { useT } from "@/features/i18n";
import { formatCurrency } from "@/shared/lib/format";
import { PageHeader } from "@/shared/components";
import { Input } from "@/shared/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import Link from "next/link";
import { ExchangeDialog } from "@/features/sales/components";
import { findSaleForExchangeAction } from "@/server/actions/sales";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Sale } from "@/shared/lib/types";

export function ExchangesClient({ initialExchanges }: { initialExchanges: any[] }) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [exchangeSale, setExchangeSale] = useState<Sale | null>(null);

  const filtered = initialExchanges.filter((ex) => {
    const s = search.toLowerCase();
    return ex.id.toLowerCase().includes(s) ||
      (ex.customer?.name || "").toLowerCase().includes(s) ||
      (ex.customer?.phone || "").toLowerCase().includes(s) ||
      (ex.data?.invoiceNo || "").toLowerCase().includes(s);
  });

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      setIsSearching(true);
      try {
        const sale = await findSaleForExchangeAction(search);
        if (sale) {
          setExchangeSale(sale as any);
          setSearch(""); // clear search on success
        } else {
          toast.error("No sale found matching that invoice or serial number.");
        }
      } catch (err: any) {
        toast.error(err.message || "Search failed");
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t("nav.exchanges")}
        description="View history of all exchanged sales."
      />

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Scan product barcode or invoice..."
            className="pl-8 bg-card pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No exchanges found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/10 group cursor-pointer">
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(sale.createdAt), "dd MMM yyyy")}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(sale.createdAt), "hh:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sale.data?.invoiceNo || sale.id.slice(0, 8).toUpperCase()}</span>
                    </TableCell>
                    <TableCell>
                      {sale.customer ? (
                        <div>
                          <p className="font-medium text-sm">{sale.customer.name}</p>
                          <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Walk-in Customer</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 border bg-background shadow-sm"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ExchangeDialog 
        sale={exchangeSale} 
        onClose={() => setExchangeSale(null)} 
      />
    </div>
  );
}
