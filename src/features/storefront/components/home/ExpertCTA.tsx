import Link from "next/link";
import { MessageCircle, Phone, ChevronRight } from "lucide-react";

/**
 * Expert CTA block — conversion section between FeaturedProducts and BrandsRow.
 * Gradient: #2563EB → #06B6D4 (Blue to Cyan)
 */
export function ExpertCTA() {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20"
      style={{
        background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-15"
        style={{ background: "rgba(255,255,255,0.4)" }}
      />
      <div
        className="absolute -bottom-20 -right-12 w-80 h-80 rounded-full pointer-events-none opacity-10"
        style={{ background: "rgba(255,255,255,0.5)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full pointer-events-none opacity-5 -translate-x-1/2 -translate-y-1/2"
        style={{ background: "rgba(255,255,255,0.8)" }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
        {/* Icon */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] mb-6 sf-animate-float"
          style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
        >
          <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
        </div>

        {/* Headline */}
        <h2
          className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.1)" }}
        >
          Need Help Choosing?
        </h2>
        <p className="text-white/80 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
          আমাদের Product Expert আপনাকে সেরা প্রোডাক্টটি বেছে নিতে সাহায্য করবে।
          Free consultation — এখনই কথা বলুন!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* WhatsApp */}
          <a
            href="https://wa.me/8801700000000?text=আমি একটি পণ্য কিনতে চাই, সাহায্য করুন"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-[14px] font-bold text-white text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 active:translate-y-0"
            style={{
              background: "#25D366",
              boxShadow: "0 6px 20px rgba(37,211,102,0.4)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "0 10px 28px rgba(37,211,102,0.55)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,211,102,0.4)")
            }
          >
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Now
          </a>

          {/* Call Us */}
          <a
            href="tel:+8801700000000"
            className="sf-btn-outline inline-flex items-center gap-2.5 px-6 py-3.5 rounded-[14px] text-sm sm:text-base"
          >
            <Phone className="h-5 w-5 shrink-0" />
            Call Us Now
          </a>
        </div>

        {/* Small trust line */}
        <p className="mt-6 text-white/60 text-xs">
          ⏰ Available: Sat–Thu, 10AM–8PM · Average response time: 2 minutes
        </p>
      </div>
    </section>
  );
}
