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
    cta1Link: "/shop",
    img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
  },
  {
    cta1Link: "/shop",
    img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=2069&auto=format&fit=crop",
  },
  {
    cta1Link: "/shop",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop",
  },
];

export function HeroBanner({ featured, slides: dbSlides }: Props) {
  const activeSlides = dbSlides && dbSlides.length > 0 
    ? dbSlides.map(s => ({
        cta1Link: s.cta1Link,
        img: s.imgUrl,
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
    <section className="w-full overflow-hidden bg-background pt-4 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative w-full h-[200px] sm:h-[350px] md:h-[450px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl group">
          {/* Banner Image */}
          <Link href={slide.cta1Link || "#"} className="absolute inset-0 block overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={slide.img}
              alt="Hero Banner"
              className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
              loading="eager"
              style={{ opacity: animating ? 0.7 : 1 }}
            />
          </Link>

          {/* Arrow navigation (Glassmorphism) - Hidden on mobile, visible on hover */}
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 border border-white/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/40 hover:scale-110 transition-all duration-300 active:scale-95 z-10 hidden sm:flex shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>
          
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 border border-white/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/40 hover:scale-110 transition-all duration-300 active:scale-95 z-10 hidden sm:flex shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          >
            <ChevronRight className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-black/20 px-3 py-2 rounded-full backdrop-blur-sm border border-white/10">
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === current ? "24px" : "8px",
                  height: "8px",
                  background: i === current ? "#ffffff" : "rgba(255,255,255,0.5)",
                  boxShadow: i === current ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
