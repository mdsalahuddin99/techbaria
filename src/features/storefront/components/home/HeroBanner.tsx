"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontProduct } from "@/features/storefront/types";

import type { HeroSlideType } from "@/shared/validators/storefront";

interface Props {
  featured?: StorefrontProduct | null;
  slides?: HeroSlideType[];
}

const defaultSlides = [
  {
    headline: "Next Generation",
    highlight: "Shopping",
    sub: "অরিজিনাল ব্র্যান্ডেড মোবাইল, ল্যাপটপ, CCTV ও গ্যাজেট। সারাদেশে ডেলিভারি ও EMI সুবিধা।",
    cta1: "Shop Now",
    cta2: "Explore Deals",
    cta1Link: "/shop",
    cta2Link: "/shop",
    img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, rgba(37,99,235,0.60) 0%, rgba(6,182,212,0.40) 100%)",
  },
  {
    headline: "Premium Tech",
    highlight: "At Best Price",
    sub: "iPhone, Samsung, Dell, Hikvision সহ সকল ব্র্যান্ডের অথেনটিক প্রোডাক্ট — Official Warranty সহ।",
    cta1: "View Collection",
    cta2: "Flash Deals",
    cta1Link: "/shop",
    cta2Link: "/shop",
    img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=2069&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, rgba(29,78,216,0.60) 0%, rgba(37,99,235,0.40) 100%)",
  },
  {
    headline: "Up to 40% Off",
    highlight: "Today Only!",
    sub: "Flash Deals, EMI 0%, Free Delivery — এই সপ্তাহের সেরা অফার মিস করবেন না।",
    cta1: "Grab Deals",
    cta2: "See All Offers",
    cta1Link: "/shop",
    cta2Link: "/shop",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, rgba(30,64,175,0.60) 0%, rgba(6,182,212,0.40) 100%)",
  },
];

export function HeroBanner({ featured, slides: dbSlides }: Props) {
  const activeSlides = dbSlides && dbSlides.length > 0 
    ? dbSlides.map(s => ({
        headline: s.headline,
        highlight: s.highlight || "",
        sub: s.sub || "",
        cta1: s.cta1,
        cta1Link: s.cta1Link,
        cta2: s.cta2 || "",
        cta2Link: s.cta2Link || "",
        img: s.imgUrl,
        gradient: s.gradient || "linear-gradient(135deg, rgba(37,99,235,0.60) 0%, rgba(6,182,212,0.40) 100%)",
      }))
    : defaultSlides;

  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 300);
    },
    [animating]
  );

  const prev = () => goTo((current - 1 + activeSlides.length) % activeSlides.length);
  const next = () => goTo((current + 1) % activeSlides.length);

  useEffect(() => {
    const t = setInterval(() => {
      goTo((current + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [current, goTo, activeSlides.length]);

  const slide = activeSlides[current];

  return (
    <section className="w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="relative w-full h-[260px] sm:h-[400px] md:h-[480px] lg:h-[520px] rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(37,99,235,0.25)]">
          {/* Banner Image */}
          <Link href={slide.cta1Link || "#"} className="absolute inset-0 block overflow-hidden">
            <img
              src={slide.img}
              alt="Hero Banner"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              loading="eager"
              style={{ opacity: animating ? 0.8 : 1 }}
            />
          </Link>

          {/* Arrow navigation */}
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="transition-all duration-300"
                style={{
                  width: i === current ? "28px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: i === current ? "#ffffff" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
