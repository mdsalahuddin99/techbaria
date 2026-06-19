"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { useSales } from "@/features/sales/hooks";
import { formatCurrency } from "@/shared/lib/format";
import { useT, useLocale } from "@/features/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { PageHeader, EmptyState } from "@/shared/components";
import { Wallet, Search } from "lucide-react";
import type { Sale } from "@/shared/lib/types";

interface DueRow {
  sale: Sale;
  due: number;
}

export default function Dues() {
  usePageTitle("Dues");
  const t = useT();
  const locale = useLocale();
  const { data: sales } = useSales();
  const [search, setSearch] = useState("");

  const dueRows = useMemo<DueRow[]>(() => {
    const q = search.trim().toLowerCase();
    return sales
      .map((s) => ({ sale: s, due: Math.max(0, s.total - s.amountPaid) }))
      .filter((r) => r.due > 0.0001)
      .filter((r) =>
        !q ||
        r.sale.invoiceNo.toLowerCase().includes(q) ||
        r.sale.customerName.toLowerCase().includes(q) ||
        (r.sale.customerPhone ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => +new Date(b.sale.date) - +new Date(a.sale.date));
  }, [sales, search]);

  const totalDue = dueRows.reduce((s, r) => s + r.due, 0);
  const customerCount = new Set(
    dueRows.map((r) => r.sale.customerId ?? r.sale.customerName)
  ).size;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("dues.title")}
        description={t("dues.description")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("dues.totalDue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(totalDue, locale)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("dues.invoices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("dues.customers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base">{t("dues.list")}</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("dues.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {dueRows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={t("dues.empty.title")}
              description={t("dues.empty.description")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dues.col.invoice")}</TableHead>
                    <TableHead>{t("dues.col.date")}</TableHead>
                    <TableHead>{t("dues.col.customer")}</TableHead>
                    <TableHead className="text-right">{t("dues.col.total")}</TableHead>
                    <TableHead className="text-right">{t("dues.col.paid")}</TableHead>
                    <TableHead className="text-right">{t("dues.col.due")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueRows.map(({ sale, due }) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.invoiceNo}</TableCell>
                      <TableCell>
                        {new Date(sale.date).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{sale.customerName || "—"}</span>
                          {sale.customerPhone && (
                            <span className="text-xs text-muted-foreground">
                              {sale.customerPhone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.total, locale)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(sale.amountPaid, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          {formatCurrency(due, locale)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
