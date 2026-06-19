/**
 * CustomerBalanceCard — shows balance, credit limit, outstanding badge.
 */
"use client";

import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Wallet, AlertTriangle, CreditCard } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";
import { useCustomerBalance } from "./ledgerHooks";

interface Props {
  customerId: string;
}

export function CustomerBalanceCard({ customerId }: Props) {
  const { data, isLoading } = useCustomerBalance(customerId);

  if (isLoading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          {/* Advance balance */}
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Advance Balance
            </p>
            <p className={`text-lg font-semibold tracking-tight tabular-nums ${(data.balance ?? 0) > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {formatCurrency(data.balance ?? 0)}
            </p>
          </div>
          {/* Due */}
          <div>
            <p className="text-xs text-muted-foreground">Due (Credit)</p>
            <p className={`text-lg font-semibold tracking-tight tabular-nums ${(data.due ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {formatCurrency(data.due ?? 0)}
            </p>
          </div>
          {/* Badges */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {data.isOverLimit && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over Limit
              </Badge>
            )}
            {data.creditLimit > 0 && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Limit: {formatCurrency(data.creditLimit)}
              </span>
            )}
            {(data.due ?? 0) === 0 && (data.balance ?? 0) === 0 && (
              <Badge variant="secondary" className="text-[10px]">Cleared</Badge>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted-foreground">Available Credit</p>
          <p className="text-lg font-semibold tabular-nums">{formatCurrency(data.availableCredit)}</p>
        </div>
      </div>
    </Card>
  );
}
