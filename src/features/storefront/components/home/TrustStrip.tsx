import { Truck, Sparkles, ShieldCheck, RotateCcw } from "lucide-react";

const items = [
  { icon: Truck, title: "Free Delivery", sub: "ঢাকায় ১৫০০৳+ অর্ডারে" },
  { icon: ShieldCheck, title: "100% Original", sub: "Official Warranty" },
  { icon: RotateCcw, title: "Easy Return", sub: "৭ দিনের রিটার্ন গ্যারান্টি" },
  { icon: Sparkles, title: "EMI 0%", sub: "সব ব্যাংক কার্ডে" },
];

export function TrustStrip() {
  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {items.map((i) => (
          <div
            key={i.title}
            className="flex items-center gap-3 rounded-2xl bg-card/[0.04] border border-white/10 p-3 sm:p-4 hover:border-indigo-400/30 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-400/20 grid place-items-center shrink-0">
              <i.icon className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{i.title}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 truncate">{i.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
