import { Zap, Flame, Sparkles, TrendingUp } from "lucide-react";

const messages = [
  { icon: Flame,      text: "🔥 Mega Sale — iPhone 15 Pro এ ১০,০০০৳ পর্যন্ত ছাড়" },
  { icon: Zap,        text: "⚡ Flash: RTX 4090 limited stock — এখনই অর্ডার করুন" },
  { icon: TrendingUp, text: "📈 Trending: Hikvision 4K CCTV combo offer" },
  { icon: Sparkles,   text: "✨ New arrival: MacBook Air M3 — pre-book open" },
];

/** Live deal ticker — Premium edge-to-edge marquee on Primary Blue bg. */
export function LiveDealTicker() {
  const row = [...messages, ...messages];
  return (
    <div
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(90deg, #15803D 0%, #16A34A 50%, #15803D 100%)" }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "sf-shimmer 3s linear infinite",
        }}
      />

      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap py-2.5 gap-10 relative z-10">
        {row.map((m, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-[11px] sm:text-sm font-semibold text-white/90"
          >
            <m.icon className="h-3.5 w-3.5 text-[#06B6D4] shrink-0" />
            {m.text}
            <span className="text-white/30 ml-6">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
