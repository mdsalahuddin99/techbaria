"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSeo } from "@/features/storefront";

export default function StorefrontTrackOrder() {
  const [orderNo, setOrderNo] = useState("");
  const router = useRouter();
  useSeo({ title: "Track order — AmarShop" });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNo.trim()) router.push(`/storefront/order/${orderNo.trim()}`);
  };

  return (
    <div className="max-w-md mx-auto px-3 sm:px-6 pt-10 sm:pt-16">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-center">Track your order</h1>
      <p className="text-sm text-slate-400 mb-6 text-center">আপনার অর্ডার নম্বরটি লিখুন</p>
      <form onSubmit={handle} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="e.g. AS-123456"
            className="w-full h-11 pl-9 pr-3 rounded-full bg-card/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-400/60 text-white"
          />
        </div>
        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 rounded-full">
          Track order
        </Button>
      </form>
      <div className="h-12" />
    </div>
  );
}
