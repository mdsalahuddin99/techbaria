"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/features/products/types";

interface Props {
  featured?: Product | null;
}

const slides = [
  {
    headline: "Next Generation",
    highlight: "Shopping",
    sub: "অরিজিনাল ব্র্যান্ডেড মোবাইল, ল্যাপটপ, CCTV ও গ্যাজেট। সারাদেশে ডেলিভারি ও EMI সুবিধা।",
    cta1: "Shop Now",
    cta2: "Explore Deals",
    cta1Link: "/shop",
    cta2Link: "/shop",
    img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, rgba(37,99,235,0.92) 0%, rgba(6,182,212,0.75) 100%)",
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
    gradient: "linear-gradient(135deg, rgba(29,78,216,0.90) 0%, rgba(37,99,235,0.70) 100%)",
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
    gradient: "linear-gradient(135deg, rgba(30,64,175,0.93) 0%, rgba(6,182,212,0.72) 100%)",
  },
];

export function HeroBanner({ featured }: Props) {
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

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = () => goTo((current + 1) % slides.length);

  useEffect(() => {
    const t = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [current, goTo]);

  const slide = slides[current];

  return (
    <section className="w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="relative w-full h-[260px] sm:h-[400px] md:h-[480px] lg:h-[520px] rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(37,99,235,0.25)]">
          {/* Background image */}
          <img
            src={slide.img}
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105"
            loading="eager"
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 transition-all duration-500"
            style={{ background: slide.gradient }}
          />

          {/* Decorative blobs */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 pointer-events-none sf-animate-blob"
            style={{ background: "rgba(6,182,212,0.5)" }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-15 pointer-events-none"
            style={{ background: "rgba(255,255,255,0.3)", animation: "sf-blob-rotate 15s linear infinite reverse" }}
          />

          {/* Content */}
          <div
            className="absolute inset-0 flex flex-col justify-center p-6 sm:p-12 md:p-16"
            style={{ opacity: animating ? 0 : 1, transition: "opacity 0.3s ease" }}
          >
            <div className="max-w-lg">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
                <span className="text-white text-[11px] font-semibold tracking-wide uppercase">
                  Premium Electronics Store
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-3">
                {slide.headline}{" "}
                <span
                  className="block sm:inline"
                  style={{ color: "#06B6D4", textShadow: "0 0 40px rgba(6,182,212,0.5)" }}
                >
                  {slide.highlight}
                </span>
              </h1>

              <p className="text-white/80 text-sm sm:text-base mb-6 max-w-sm leading-relaxed">
                {slide.sub}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={slide.cta1Link}
                  className="sf-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold rounded-[12px]"
                >
                  {slide.cta1}
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href={slide.cta2Link}
                  className="sf-btn-outline inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold rounded-[12px]"
                >
                  {slide.cta2}
                </Link>
              </div>
            </div>
          </div>

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
            {slides.map((_, i) => (
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
