"use client";

import Link from "next/link";
import { ScanBarcode, Boxes, BarChart3, Users, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

const features = [
  { icon: ScanBarcode, title: "Fast POS Checkout", desc: "Barcode scanning, split payments, hold sales — built for busy counters." },
  { icon: Boxes, title: "Smart Inventory", desc: "Multi-branch stock, transfers, restock alerts, serial & warranty tracking." },
  { icon: BarChart3, title: "Real-time Reports", desc: "Sales, profit, expenses, dues — all at a glance with daily summaries." },
  { icon: Users, title: "Customer & Dues", desc: "CRM, loyalty, due management with partial payments and reminders." },
  { icon: ShieldCheck, title: "Roles & Audit", desc: "Owner, manager, cashier roles with full audit trails for every action." },
  { icon: Smartphone, title: "Works Offline", desc: "PWA with offline queue — never lose a sale during internet outage." },
];

const stats = [
  { value: "5K+", label: "Daily transactions" },
  { value: "99.9%", label: "Uptime" },
  { value: "<200ms", label: "Checkout speed" },
  { value: "24/7", label: "Bengali support" },
];

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mx-auto">Modern POS for Growing Shops</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Run your entire shop from <span className="text-primary">one screen</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Inventory, sales, customers, suppliers, accounts, reports — everything an electronics, grocery, or pharmacy needs to grow without spreadsheets.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button asChild size="lg">
                <Link href="/register">Start Free Trial <svg className="ml-2 h-4 w-4" aria-hidden="true"><use href="#arrow-right" /></svg></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">No credit card • 14-day trial • Cancel anytime</p>
          </div>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need, nothing you don't</h2>
          <p className="text-muted-foreground">Built with real shopkeepers — every feature solves a daily pain.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6 hover:shadow-md transition-shadow">
              <f.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison / Why us */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Why shop owners switch to us</h2>
            <ul className="space-y-3">
              {[
                "Bilingual interface (English + বাংলা)",
                "Online storefront included — sell on web too",
                "Multi-branch with stock transfer",
                "Thermal & A4 invoice printing",
                "Built-in warranty & serial tracking",
                "Daily auto-backup, export anytime",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="h-5 w-5 text-primary">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-background">
            <div className="space-y-4">
              <Badge>Try it in 60 seconds</Badge>
              <h3 className="text-xl font-semibold">No setup, no install</h3>
              <p className="text-muted-foreground text-sm">
                Sign up, add your products, and start billing. Your data is safe in the cloud and works on any device.
              </p>
              <Button asChild className="w-full">
                <Link href="/register">Create my shop</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-20 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10">Common questions</h2>
        <div className="space-y-4">
          {[
            { q: "Is there a free trial?", a: "Yes — 14 days, full features, no card required." },
            { q: "Can I use it offline?", a: "Yes. The POS works offline and syncs when you reconnect." },
            { q: "How many staff can use it?", a: "Depends on your plan — Starter 2, Growth 5, Scale unlimited." },
            { q: "Can I migrate from my old system?", a: "Yes — CSV import for products, customers, and suppliers." },
          ].map((f) => (
            <Card key={f.q} className="p-5">
              <h3 className="font-semibold mb-1">{f.q}</h3>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button asChild size="lg">
            <Link href="/register">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
