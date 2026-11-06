"use client";

import { useRef, useState } from "react";
import { ProductImage } from "./product-image";

// Hover-to-zoom for the product stage. The packshot sits on a white seamless
// background, so `mix-blend-multiply` dissolves the photo's own white box into
// the stage — no visible edge. On touch devices it stays a normal image so the
// browser's pinch-zoom still works.
export function ZoomImage({
  src,
  alt,
  seed,
  zoom = 2.1,
  priority = false,
}: {
  src?: string;
  alt: string;
  seed: string;
  zoom?: number;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  if (!src) {
    return <ProductImage src={src} alt={alt} seed={seed} fit="contain" />;
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseMove={handleMove}
      className="group/zoom relative h-full w-full cursor-zoom-in overflow-hidden"
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full select-none object-contain mix-blend-multiply transition-transform duration-300 ease-out"
        style={{ transform: active ? `scale(${zoom})` : "scale(1)", transformOrigin: origin }}
      />
      <span className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full border border-[rgba(28,43,32,0.12)] bg-white/80 px-3 py-1.5 text-[0.68rem] font-medium text-ink/70 backdrop-blur-sm transition-opacity duration-200 group-hover/zoom:opacity-0 md:flex">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" strokeLinecap="round" />
        </svg>
        Acerca para ampliar
      </span>
    </div>
  );
}
