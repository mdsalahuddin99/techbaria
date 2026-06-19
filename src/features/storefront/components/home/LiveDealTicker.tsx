import { Zap, Flame, Sparkles, TrendingUp } from "lucide-react";

const messages = [
  { icon: Flame, text: "🔥 Mega Sale — iPhone 15 Pro এ ১০,০০০৳ পর্যন্ত ছাড়" },
  { icon: Zap, text: "⚡ Flash: RTX 4090 limited stock — এখনই অর্ডার করুন" },
  { icon: TrendingUp, text: "📈 Trending: Hikvision 4K CCTV combo offer" },
  { icon: Sparkles, text: "✨ New arrival: MacBook Air M3 — pre-book open" },
];

/** Live deal ticker — Awwwards-style edge-to-edge marquee. */
export function LiveDealTicker() {
  const row = [...messages, ...messages];
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/40 via-[#020617] to-indigo-900/40 border-y border-indigo-500/20">
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap py-2 gap-10">
        {row.map((m, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-200 font-medium"
          >
            <m.icon className="h-3.5 w-3.5 text-indigo-300" />
            {m.text}
            <span className="text-indigo-500/40 ml-6">•</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
