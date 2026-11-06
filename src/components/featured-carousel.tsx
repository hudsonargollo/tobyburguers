"use client";

import { useEffect, useRef } from "react";
import type { ProductView } from "@/lib/types";
import { ProductCard } from "./product-card";

export function FeaturedCarousel({ products }: { products: ProductView[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const step = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 260);
    // Loop: if at (or near) the end and moving right, jump back to start.
    if (dir === 1 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: amount * dir, behavior: "smooth" });
    }
  };

  // Autoplay
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) step(1);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  if (products.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="flex w-[70%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(25%-15px)]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        onClick={() => step(-1)}
        aria-label="Anterior"
        className="absolute -left-3 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-cream text-brand dark:text-ink shadow-sm transition hover:border-accent hover:bg-accent hover:text-brand-deep md:flex"
      >
        ‹
      </button>
      <button
        onClick={() => step(1)}
        aria-label="Siguiente"
        className="absolute -right-3 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-cream text-brand dark:text-ink shadow-sm transition hover:border-accent hover:bg-accent hover:text-brand-deep md:flex"
      >
        ›
      </button>
    </div>
  );
}
