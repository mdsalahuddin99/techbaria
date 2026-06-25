import Link from "next/link";
import {
  Phone, MapPin, Mail,
  Facebook, Instagram, Youtube,
  MessageCircle, ShieldCheck, Truck, CreditCard, PackageCheck,
} from "lucide-react";

export function StorefrontFooter() {
  return (
    <footer style={{ background: "#1D4ED8" }}>

      {/* ── Newsletter ── */}
      <div
        className="border-b"
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-1">
                Subscribe to our Newsletter
              </h3>
              <p className="text-sm text-white/70">
                সেরা ডিল, নতুন পণ্য এবং এক্সক্লুসিভ অফার সবার আগে পান।
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full md:w-auto gap-2"
            >
              <input
                type="email"
                placeholder="আপনার ইমেইল লিখুন..."
                className="flex-1 md:w-72 px-4 py-3 rounded-[12px] text-sm font-medium focus:outline-none focus:ring-2"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  color: "#ffffff",
                }}
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-[12px] text-sm font-bold text-[#1D4ED8] bg-white hover:bg-[#EFF6FF] transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Trust strip ── */}
      <div
        className="border-b"
        style={{ borderColor: "rgba(255,255,255,0.10)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: Truck, t: "Fast Delivery", s: "Dhaka 24h, Outside 2-3 days" },
            { icon: ShieldCheck, t: "Genuine Products", s: "100% authorized brands" },
            { icon: PackageCheck, t: "Easy Return", s: "7-day return policy" },
            { icon: CreditCard, t: "Secure Payment", s: "COD, bKash, Card, EMI" },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <x.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">{x.t}</div>
                <div className="text-[11px] sm:text-xs text-white/60">{x.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main footer grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-[#1D4ED8] text-lg"
              style={{ background: "rgba(255,255,255,0.95)" }}
            >
              A
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">AmarShop</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-5">
            অরিজিনাল ব্র্যান্ডেড মোবাইল, ল্যাপটপ, CCTV ও গ্যাজেট। সারাদেশে ডেলিভারি ও EMI সুবিধা।
          </p>
          {/* Social icons */}
          <div className="flex items-center gap-2">
            {[
              { Icon: Facebook, href: "#", label: "Facebook" },
              { Icon: Instagram, href: "#", label: "Instagram" },
              { Icon: Youtube, href: "#", label: "YouTube" },
              { Icon: MessageCircle, href: "https://wa.me/8801700000000", label: "WhatsApp" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
                }
              >
                <Icon className="h-4 w-4 text-white" />
              </a>
            ))}
          </div>
        </div>

        {/* Shop links */}
        <div>
          <div className="text-sm font-bold text-white mb-4">Shop</div>
          <ul className="space-y-2.5 text-xs text-white/60">
            {[
              ["All Products", "/shop"],
              ["Mobile", "/shop/Mobile"],
              ["Laptop", "/shop/Laptop"],
              ["CCTV Camera", "/shop/CCTV%20Camera"],
              ["Accessories", "/shop"],
            ].map(([label, href]) => (
              <li key={label}>
                <Link
                  href={href}
                  className="hover:text-white transition-colors duration-150"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Help links */}
        <div>
          <div className="text-sm font-bold text-white mb-4">Help & Support</div>
          <ul className="space-y-2.5 text-xs text-white/60">
            {[
              ["Track Order", "/track"],
              ["My Account", "/account"],
              ["Return Policy", "#"],
              ["Warranty Info", "#"],
              ["Privacy Policy", "#"],
            ].map(([label, href]) => (
              <li key={label}>
                <Link
                  href={href}
                  className="hover:text-white transition-colors duration-150"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <div className="text-sm font-bold text-white mb-4">Contact Us</div>
          <ul className="space-y-3 text-xs text-white/60">
            <li className="flex items-center gap-2.5">
              <Phone className="h-3.5 w-3.5 text-[#93C5FD] shrink-0" />
              <a href="tel:+8801700000000" className="hover:text-white">+880 1700-000000</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 text-[#93C5FD] shrink-0" />
              <a href="mailto:support@amarshop.bd" className="hover:text-white">support@amarshop.bd</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="h-3.5 w-3.5 text-[#93C5FD] shrink-0 mt-0.5" />
              <span>Dhaka, Bangladesh</span>
            </li>
          </ul>

          {/* Payment badges */}
          <div className="mt-5">
            <div className="text-[10px] font-semibold text-white/50 mb-2 uppercase tracking-wider">Payment Methods</div>
            <div className="flex flex-wrap gap-1.5">
              {["bKash", "Nagad", "Visa", "Master", "COD"].map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white/80"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright bar ── */}
      <div
        className="border-t"
        style={{ background: "#1E40AF", borderColor: "rgba(255,255,255,0.10)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/50">
          <span>© {new Date().getFullYear()} AmarShop. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-3.5 w-3.5 text-[#93C5FD]" />
            <span>SSL Secured &amp; 100% Safe Checkout</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
