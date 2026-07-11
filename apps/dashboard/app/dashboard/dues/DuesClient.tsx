"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/shared/lib/format";
import { useT, useLocale } from "@/features/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { PageHeader, EmptyState } from "@/shared/components";
import { Wallet, Search, Receipt, History } from "lucide-react";
import type { Customer } from "@/shared/lib/types";
import { useCustomers } from "@/features/customers/hooks";
import { CustomerHistorySheet } from "@/features/customers/components/CustomerHistorySheet";
import { CustomerWalletDialog } from "@/features/customers/CustomerWalletDialog";
import { useActiveAccounts } from "@/features/accounts/hooks";

export function DuesClient({ initialCustomers, initialAccounts }: { initialCustomers: Customer[], initialAccounts: any[] }) {
  usePageTitle("Dues");
  const t = useT();
  const locale = useLocale();
  const { data: customers = initialCustomers } = useCustomers(initialCustomers);
  const accounts = useActiveAccounts(initialAccounts);
  const [search, setSearch] = useState("");
  
  const [historyFor, setHistoryFor] = useState<Customer | null>(null);
  const [collectFor, setCollectFor] = useState<Customer | null>(null);

  const dueCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => (c.due ?? 0) > 0.0001)
      .filter((c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => (b.due ?? 0) - (a.due ?? 0));
  }, [customers, search]);

  const totalDue = dueCustomers.reduce((sum, c) => sum + (c.due ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("dues.title")}
        description={t("dues.description")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
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
              {t("dues.customers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueCustomers.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-warning" />
            Due Balances
          </CardTitle>
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
        <CardContent className="p-0">
          {dueCustomers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Wallet}
                title={t("dues.empty.title")}
                description={t("dues.empty.description")}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table variant="premium">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Due Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell className="text-right text-warning font-semibold">
                        {formatCurrency(c.due ?? 0, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setHistoryFor(c)}>
                          <History className="h-3.5 w-3.5 mr-1" />View Invoices
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerHistorySheet 
        customer={historyFor} 
        onClose={() => setHistoryFor(null)} 
        onCollect={setCollectFor} 
      />

      <CustomerWalletDialog
        open={!!collectFor}
        onOpenChange={(o) => !o && setCollectFor(null)}
        customerId={collectFor?.id ?? ""}
        customerName={collectFor?.name ?? ""}
        currentBalance={collectFor?.balance ?? 0}
        accounts={accounts}
      />
    </div>
  );
}
