"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { PageHeader, EmptyState } from "@/shared/components";
import { useProducts } from "@/features/products/hooks";
import { useSales } from "@/features/sales/hooks";
import { lookupWarranty, type WarrantyLookupResult } from "@/features/warranty/lookup";
import { formatWarrantyEnd } from "@/features/products/warranty";
import { formatDateTime } from "@/shared/lib/format";
import { Search, Camera, ShieldCheck, ShieldAlert, ShieldX, Receipt, RefreshCcw } from "lucide-react";
import CameraScanner from "@/components/CameraScanner";
import { toast } from "sonner";

function StatusBadge({ result }: { result: WarrantyLookupResult }) {
  const s = result.status;
  if (s.kind === "none") {
    return (
      <Badge variant="outline" className="gap-1">
        <ShieldX className="h-3.5 w-3.5" /> No warranty
      </Badge>
    );
  }
  if (s.kind === "expired") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="h-3.5 w-3.5" /> Expired ({s.daysAgo}d ago)
      </Badge>
    );
  }
  if (s.nearExpiry) {
    return (
      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500/90">
        <ShieldAlert className="h-3.5 w-3.5" /> {s.daysLeft}d left
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600/90">
      <ShieldCheck className="h-3.5 w-3.5" /> Active · {s.daysLeft}d left
    </Badge>
  );
}

function ResultCard({ r }: { r: WarrantyLookupResult }) {
  const id = r.unit?.serialNumber || r.unit?.imei || r.product.serialNumber || r.product.imei || "—";
  const endDate = r.status.kind !== "none" ? formatWarrantyEnd(r.status.endDate) : "—";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-muted-foreground">{r.product.brand} {r.product.model}</div>
          <div className="font-semibold text-lg">{r.product.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Matched by <code className="bg-muted px-1 rounded">{r.matchedBy}</code> · ID: <code className="bg-muted px-1 rounded">{id}</code>
          </div>
        </div>
        <StatusBadge result={r} />
      </div>

      <Separator />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Warranty</div>
          <div className="font-medium">{r.warrantyMonths > 0 ? `${r.warrantyMonths} months` : "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Start</div>
          <div className="font-medium">{r.warrantyStartDate ? new Date(r.warrantyStartDate).toLocaleDateString() : "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Ends</div>
          <div className="font-medium">{endDate}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Status</div>
          <div className="font-medium capitalize">{r.status.kind}</div>
        </div>
      </div>

      {r.sale && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Sold in</div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <span className="font-mono font-semibold">{r.sale.invoiceNo}</span>
                <span className="text-muted-foreground"> · {formatDateTime(r.sale.date)}</span>
              </div>
              <div className="text-sm">
                Customer: <span className="font-medium">{r.sale.customerName || "Walk-in"}</span>
                {r.sale.customerPhone && <span className="text-muted-foreground"> · {r.sale.customerPhone}</span>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/sales"><Receipt className="h-4 w-4 mr-1" /> Open invoice</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/returns"><RefreshCcw className="h-4 w-4 mr-1" /> Start return / replace</Link>
              </Button>
            </div>
          </div>
        </>
      )}

      {!r.sale && (
        <div className="text-xs text-muted-foreground italic">
          এই unit এখনো বিক্রি হয়নি (in stock).
        </div>
      )}
    </Card>
  );
}

export function WarrantyLookupClient() {
  const { data: products } = useProducts();
  const { data: sales } = useSales();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const results = useMemo(
    () => (submitted ? lookupWarranty(submitted, products, sales) : []),
    [submitted, products, sales],
  );

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(query.trim());
  };

  const onScan = (code: string) => {
    setQuery(code);
    setSubmitted(code);
    toast.success(`Scanned: ${code}`);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Warranty Lookup"
        description="Serial / IMEI / invoice নম্বর দিয়ে warranty ও sale history খুঁজুন।"
      />

      <Card className="p-4">
        <form onSubmit={onSubmit} className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Serial / IMEI / Invoice No."
              className="pl-9"
            />
          </div>
          <Button type="submit"><Search className="h-4 w-4 mr-1" /> Search</Button>
          <Button type="button" variant="outline" onClick={() => setCameraOpen(true)}>
            <Camera className="h-4 w-4 mr-1" /> Scan
          </Button>
        </form>
      </Card>

      {submitted && results.length === 0 && (
        <EmptyState
          icon={ShieldX}
          title="কিছু পাওয়া যায়নি"
          description={`"${submitted}" নামে কোনো serial, IMEI বা invoice খুঁজে পাওয়া যায়নি।`}
        />
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{results.length} টি ফলাফল</div>
          {results.map((r, i) => (
            <ResultCard key={`${r.product.id}-${r.unit?.id ?? i}`} r={r} />
          ))}
        </div>
      )}

      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={onScan}
      />
    </div>
  );
}
