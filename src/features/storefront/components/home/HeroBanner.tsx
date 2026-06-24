import Link from "next/link";
import type { Product } from "@/features/products/types";

interface Props {
  featured?: Product | null;
}

export function HeroBanner({ featured }: Props) {
  // Since the user wants the entire hero section to be a single image banner
  // We'll use a high quality banner image. In production, this would come from a CMS or settings.
  const bannerImageUrl = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop";

  return (
    <section className="w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link href="/shop" className="block relative w-full h-[250px] sm:h-[400px] md:h-[500px] lg:h-[550px] rounded-3xl overflow-hidden shadow-2xl group">
          <img 
            src={bannerImageUrl} 
            alt="Hero Banner" 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-in-out"
          />
          {/* Subtle gradient overlay to make it look premium */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/80 via-slate-900/20 to-transparent"></div>
          
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 md:p-16">
             <div className="max-w-md glass-card p-6 sm:p-8 rounded-2xl transform translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
                  Next Gen <br className="hidden sm:block"/> <span className="text-indigo-300">Shopping</span>
                </h1>
                <p className="text-slate-200 text-sm sm:text-base mb-6 line-clamp-2">
                  Discover the latest trends with exclusive flash deals. Upgrade your lifestyle today.
                </p>
                <div className="inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all active:scale-95">
                  Explore Now
                </div>
             </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
