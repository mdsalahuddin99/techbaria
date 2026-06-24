import { Truck, ShieldCheck, RotateCcw, CreditCard } from "lucide-react";

const items = [
  { icon: Truck, title: "Free Delivery", sub: "ঢাকায় ১৫০০৳+ অর্ডারে" },
  { icon: ShieldCheck, title: "100% Original", sub: "Official Warranty সহ" },
  { icon: RotateCcw, title: "Easy Return", sub: "৭ দিনের রিটার্ন গ্যারান্টি" },
  { icon: CreditCard, title: "EMI 0%", sub: "সব ব্যাংক কার্ডে" },
];

export function TrustStrip() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 py-4 px-3 sm:px-5 hover:bg-slate-50 transition"
            >
              <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 grid place-items-center shrink-0">
                <item.icon className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.title}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
