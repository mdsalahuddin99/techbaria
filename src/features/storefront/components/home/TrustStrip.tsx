"use client";

import { Truck, ShieldCheck, RotateCcw, CreditCard } from "lucide-react";

const items = [
  {
    icon: Truck,
    title: "Fast Delivery",
    sub: "ঢাকায় ১৫০০৳+ অর্ডারে Free",
    color: "#2563EB",
    bg: "#DBEAFE",
  },
  {
    icon: ShieldCheck,
    title: "100% Original",
    sub: "Official Warranty সহ",
    color: "#06B6D4",
    bg: "#CFFAFE",
  },
  {
    icon: RotateCcw,
    title: "Easy Return",
    sub: "৭ দিনের রিটার্ন গ্যারান্টি",
    color: "#2563EB",
    bg: "#DBEAFE",
  },
  {
    icon: CreditCard,
    title: "EMI 0%",
    sub: "সব ব্যাংক কার্ডে সুবিধা",
    color: "#06B6D4",
    bg: "#CFFAFE",
  },
];

export function TrustStrip() {
  return (
    <section style={{ background: "#EFF6FF" }} className="py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {items.map((item, i) => (
            <div
              key={item.title}
              className="group flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-[20px] bg-card text-card-foreground cursor-default transition-all duration-300 hover:-translate-y-1 sf-animate-slide-up"
              style={{
                boxShadow: "0 4px 20px rgba(37,99,235,0.06)",
                animationDelay: `${i * 0.1}s`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 12px 36px rgba(37,99,235,0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 20px rgba(37,99,235,0.06)")
              }
            >
              <div
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: item.bg }}
              >
                <item.icon
                  className="h-6 w-6 sm:h-7 sm:w-7 transition-colors"
                  style={{ color: item.color }}
                />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm mt-1 text-muted-foreground leading-relaxed">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
