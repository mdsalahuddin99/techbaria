import Link from "next/link";
import { Phone, MapPin, Mail, ShieldCheck, Truck, CreditCard, PackageCheck } from "lucide-react";

export function StorefrontFooter() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-[#0f172a]">
      {/* Trust strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-b border-slate-800">
        {[
          { icon: Truck, t: "Fast Delivery", s: "Dhaka 24h, Outside 2-3 days" },
          { icon: ShieldCheck, t: "Genuine Products", s: "100% authorized brands" },
          { icon: PackageCheck, t: "Easy Return", s: "7-day return policy" },
          { icon: CreditCard, t: "Secure Payment", s: "COD, bKash, Card" },
        ].map((x) => (
          <div key={x.t} className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/15 border border-indigo-400/20 grid place-items-center shrink-0">
              <x.icon className="h-4 w-4 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{x.t}</div>
              <div className="text-[11px] sm:text-xs text-slate-400">{x.s}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center font-bold text-white">A</div>
            <span className="text-lg font-semibold tracking-tight">AmarShop</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            অরিজিনাল ব্র্যান্ডেড মোবাইল, ল্যাপটপ, CCTV ও গ্যাজেট। সারাদেশে ডেলিভারি ও EMI সুবিধা।
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold text-white mb-3">Shop</div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li><Link href="/shop" className="hover:text-white">All Products</Link></li>
            <li><Link href="/shop/Mobile" className="hover:text-white">Mobile</Link></li>
            <li><Link href="/shop/Laptop" className="hover:text-white">Laptop</Link></li>
            <li><Link href="/shop/CCTV%20Camera" className="hover:text-white">CCTV</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-white mb-3">Help</div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li><Link href="/track" className="hover:text-white">Track Order</Link></li>
            <li><Link href="/account" className="hover:text-white">My Account</Link></li>
            <li><a className="hover:text-white" href="#">Return Policy</a></li>
            <li><a className="hover:text-white" href="#">Warranty</a></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-white mb-3">Contact</div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-indigo-300" /> +880 1700-000000</li>
            <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-indigo-300" /> support@amarshop.bd</li>
            <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-indigo-300" /> Dhaka, Bangladesh</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-[11px] text-slate-500 text-center">
          © {new Date().getFullYear()} AmarShop. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
