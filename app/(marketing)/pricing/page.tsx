"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

type Plan = {
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  popular?: boolean;
  cta: string;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For single-counter shops just getting started.",
    monthly: 499,
    yearly: 4990,
    features: ["1 branch, 2 staff", "Unlimited products", "POS + Inventory", "Basic reports", "Email support"],
    cta: "Start Free Trial",
  },
  {
    name: "Growth",
    tagline: "For busy shops that need multi-staff & deeper insights.",
    monthly: 999,
    yearly: 9990,
    features: ["Up to 2 branches, 5 staff", "Online storefront", "Customer loyalty & dues", "Advanced reports", "WhatsApp support", "Warranty & serial tracking"],
    popular: true,
    cta: "Start Free Trial",
  },
  {
    name: "Scale",
    tagline: "For chains & businesses with custom needs.",
    monthly: 1999,
    yearly: 19990,
    features: ["Unlimited branches & staff", "API access", "Custom invoice templates", "Priority support", "Dedicated onboarding", "Audit logs & RBAC"],
    cta: "Talk to Sales",
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="text-4xl md:text-5xl font-bold">Simple pricing, no surprises</h1>
        <p className="text-muted-foreground">Pick a plan that fits your shop. Switch or cancel anytime.</p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={!yearly ? "font-medium" : "text-muted-foreground"}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            onClick={() => setYearly(!yearly)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${yearly ? "bg-primary" : "bg-input"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform ring-0 transition-transform ${yearly ? "translate-x-5" : "translate-x-0"}`} />
          </button>
          <span className={yearly ? "font-medium" : "text-muted-foreground"}>
            Yearly <Badge variant="secondary" className="ml-1">Save 17%</Badge>
          </span>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          const suffix = yearly ? "/year" : "/month";
          return (
            <Card key={plan.name} className={`p-6 relative flex flex-col ${plan.popular ? "border-primary ring-2 ring-primary/20 shadow-lg" : ""}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              <div className="space-y-2 mb-6">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground min-h-[40px]">{plan.tagline}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">৳{price.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">{suffix}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
                <Link href="/register">{plan.cta}</Link>
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-10">
        All plans include 14‑day free trial • No credit card required • Cancel anytime
      </p>
    </section>
  );
}
