import Link from "next/link";
import Image from "next/image";
import {
  Phone, MapPin, Mail,
  Facebook, Instagram, Youtube,
  MessageCircle, ShieldCheck, Truck, CreditCard, PackageCheck,
} from "lucide-react";
import { getSiteConfig } from "../../actions/config.actions";

export async function StorefrontFooter() {
  const general = ((await getSiteConfig("general")) as Record<string, any>) || {};
  const social = ((await getSiteConfig("social")) as Record<string, any>) || {};
  const footer = ((await getSiteConfig("footer")) as Record<string, any>) || {};
  
  const shopName = general.storeName || "AmarShop";
  const phone = general.phone || "+880 1700-000000";
  const email = general.email || "support@amarshop.bd";
  const address = general.address || "Dhaka, Bangladesh";

  const socialLinks = [];
  if (social.facebook) socialLinks.push({ Icon: Facebook, href: social.facebook, label: "Facebook" });
  if (social.instagram) socialLinks.push({ Icon: Instagram, href: social.instagram, label: "Instagram" });
  if (social.youtube) socialLinks.push({ Icon: Youtube, href: social.youtube, label: "YouTube" });
  // Always keep WhatsApp for now, or use phone number to generate wa.me link
  socialLinks.push({ Icon: MessageCircle, href: `https://wa.me/${phone.replace(/[^0-9]/g, '')}`, label: "WhatsApp" });

  const aboutText = footer.aboutText || "অরিজিনাল ব্র্যান্ডেড মোবাইল, ল্যাপটপ, CCTV ও গ্যাজেট। সারাদেশে ডেলিভারি ও EMI সুবিধা।";
  
  const shopLinks = footer.shopLinks || [
    { label: "All Products", url: "/shop" },
    { label: "Mobile", url: "/shop/Mobile" },
    { label: "Laptop", url: "/shop/Laptop" },
    { label: "CCTV Camera", url: "/shop/CCTV%20Camera" },
    { label: "Accessories", url: "/shop" },
  ];

  const helpLinks = footer.helpLinks || [
    { label: "Track Order", url: "/track" },
    { label: "My Account", url: "/account" },
    { label: "Return Policy", url: "#" },
    { label: "Warranty Info", url: "#" },
    { label: "Privacy Policy", url: "#" },
  ];

  return (
    <footer className="w-full text-white">


      {/* ── Main footer grid ── */}
      <div className="bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            {general.logoUrl ? (
              <div className="relative h-12 w-[160px]">
                <Image 
                  src={general.logoUrl} 
                  alt={shopName} 
                  fill
                  sizes="160px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <>
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-[#15803D] text-lg"
                  style={{ background: "rgba(255,255,255,0.95)" }}
                >
                  {shopName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">{shopName}</span>
              </>
            )}
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-5 whitespace-pre-line">
            {aboutText}
          </p>
          {/* Social icons */}
          <div className="flex items-center gap-2">
            {socialLinks.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 bg-white/10 border border-white/20 hover:bg-white/20"
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
            {shopLinks.map((link: any, i: number) => (
              <li key={i}>
                <Link
                  href={link.url}
                  className="hover:text-white transition-colors duration-150"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Help links */}
        <div>
          <div className="text-sm font-bold text-white mb-4">Help & Support</div>
          <ul className="space-y-2.5 text-xs text-white/60">
            {helpLinks.map((link: any, i: number) => (
              <li key={i}>
                <Link
                  href={link.url}
                  className="hover:text-white transition-colors duration-150"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="col-span-2 md:col-span-1">
          <div className="text-sm font-bold text-white mb-4">Contact Us</div>
          <ul className="space-y-3 text-xs text-white/60">
            <li className="flex items-center gap-2.5">
              <Phone className="h-3.5 w-3.5 text-[#93C5FD] shrink-0" />
              <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="hover:text-white">{phone}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 text-[#93C5FD] shrink-0" />
              <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="h-3.5 w-3.5 text-[#93C5FD] shrink-0 mt-0.5" />
              <span>{address}</span>
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
      </div>

      {/* ── Copyright bar ── */}
      <div
        className="border-t"
        style={{ background: "#1E3A8A", borderColor: "rgba(255,255,255,0.10)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/50">
          <span>© {new Date().getFullYear()} {shopName}. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-3.5 w-3.5 text-[#93C5FD]" />
            <span>SSL Secured &amp; 100% Safe Checkout</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
