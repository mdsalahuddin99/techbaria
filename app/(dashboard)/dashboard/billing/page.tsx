"use client";

import Link from "next/link";
import { CreditCard, Download, Sparkles, AlertCircle } from "lucide-react";
import { PageHeader } from "@/shared/components";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";

/**
 * Billing & Subscription page — mock UI for SaaS billing.
 * Backend hookup happens after Next.js migration (Stripe/SSLCOMMERZ).
 */

const MOCK_USAGE = [
  { label: "Products", used: 248, limit: 1000 },
  { label: "Monthly Sales", used: 1340, limit: 5000 },
  { label: "Staff Accounts", used: 3, limit: 5 },
  { label: "Storage", used: 1.2, limit: 5, unit: "GB" },
];

const MOCK_INVOICES = [
  { id: "INV-2026-005", date: "May 1, 2026", amount: 999, status: "Paid" },
  { id: "INV-2026-004", date: "Apr 1, 2026", amount: 999, status: "Paid" },
  { id: "INV-2026-003", date: "Mar 1, 2026", amount: 999, status: "Paid" },
  { id: "INV-2026-002", date: "Feb 1, 2026", amount: 999, status: "Paid" },
];

export default function Billing() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription"
        description="Manage your plan, payment method, and invoices."
      />

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Growth Plan</h2>
              <Badge>Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ৳999 / month • Renews on <span className="font-medium text-foreground">June 1, 2026</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/pricing">Change Plan</Link>
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              Cancel
            </Button>
          </div>
        </div>
      </Card>

      {/* Usage */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Usage this period</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {MOCK_USAGE.map((u) => {
            const pct = Math.min(100, (u.used / u.limit) * 100);
            const near = pct >= 80;
            return (
              <div key={u.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{u.label}</span>
                  <span className={near ? "text-destructive font-medium" : ""}>
                    {u.used}{u.unit ? ` ${u.unit}` : ""} / {u.limit}{u.unit ? ` ${u.unit}` : ""}
                  </span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Payment Method */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Visa ending in 4242</div>
              <div className="text-xs text-muted-foreground">Expires 12/27</div>
            </div>
          </div>
          <Button variant="outline" size="sm">Update</Button>
        </div>
      </Card>

      {/* Invoices */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Invoice history</h3>
        <div className="divide-y">
          {MOCK_INVOICES.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-sm">{inv.id}</div>
                <div className="text-xs text-muted-foreground">{inv.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">৳{inv.amount.toLocaleString()}</span>
                <Badge variant="secondary">{inv.status}</Badge>
                <Button size="icon" variant="ghost" aria-label="Download">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Payment integration is a placeholder UI. Real billing will be wired in after deployment
            with your chosen provider (Stripe, SSLCOMMERZ, etc.).
          </p>
        </div>
      </Card>
    </div>
  );
}
