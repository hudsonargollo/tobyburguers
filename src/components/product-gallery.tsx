"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductImage } from "./product-image";
import { ZoomImage } from "./zoom-image";

const AUTOPLAY_MS = 5200;

// White seamless product stage: the packshot's own white box dissolves into the
// stage, the gallery advances like a slideshow, and thumbnails stay in reach.
export function ProductGallery({
  images,
  name,
  slug,
}: {
  images: string[];
  name: string;
  slug: string;
}) {
  const slides = images.slice(0, 6);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + count) % count),
    [count]
  );

  useEffect(() => {
    if (!playing || hovered || reduced || count < 2) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [active, playing, hovered, reduced, count]);

  const autoplaying = playing && !hovered && !reduced;

  return (
    <div>
      <div
        role="group"
        aria-label={`Galería de ${name}`}
        className="group relative aspect-square overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-white shadow-[0_34px_80px_-48px_rgba(110,10,6,0.55)]"
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          setHovered(true);
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          setHovered(false);
          if (start == null || count < 2) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* Seamless white stage: soft vignette + contact shadow under the pack */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(78% 66% at 50% 40%, #ffffff 0%, #ffffff 60%, #f4f7ee 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[72%] h-14 w-[58%] -translate-x-1/2 rounded-[50%] bg-[rgba(110,10,6,0.13)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-accent/10 blur-2xl"
        />

        {/* Slides */}
        {count === 0 ? (
          <ProductImage src={undefined} alt={name} seed={slug} />
        ) : (
          slides.map((src, i) => (
            <div
              key={`${src}-${i}`}
              aria-hidden={i !== active}
              className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                i === active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {i === active ? (
                <ZoomImage src={src} alt={name} seed={`${slug}-${i}`} priority={i === 0} />
              ) : (
                <ProductImage
                  src={src}
                  alt={name}
                  seed={`${slug}-${i}`}
                  fit="contain"
                  className="mix-blend-multiply"
                />
              )}
            </div>
          ))
        )}

        {/* Inner hairline frame */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded-[1.3rem] border border-[rgba(28,43,32,0.06)]"
        />

        {/* Counter + play/pause */}
        {count > 1 && (
          <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2">
            <span className="rounded-full border border-[rgba(28,43,32,0.08)] bg-white/80 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/60 backdrop-blur-sm">
              Producto
            </span>
            <div className="flex items-center gap-1 rounded-full border border-[rgba(28,43,32,0.1)] bg-white/85 py-1 pl-3 pr-1 backdrop-blur-sm">
              <span className="font-display text-[0.72rem] font-semibold tracking-[0.1em] text-ink/70 [font-variant-numeric:tabular-nums]">
                <span className="text-accent-strong">{String(active + 1).padStart(2, "0")}</span>
                <span className="mx-1 text-ink/30">/</span>
                {String(count).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pausar la galería" : "Reproducir la galería"}
                aria-pressed={!playing}
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink/60 transition hover:bg-accent/10 hover:text-accent-strong"
              >
                {playing ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 4.5v15l13-7.5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Arrows */}
        {count > 1 && (
          <>
            <Arrow
              dir="prev"
              onClick={() => go(-1)}
              className="left-3 md:opacity-0 md:group-hover:opacity-100"
            />
            <Arrow
              dir="next"
              onClick={() => go(1)}
              className="right-3 md:opacity-0 md:group-hover:opacity-100"
            />
          </>
        )}

        {/* Autoplay segments */}
        {count > 1 && (
          <div className="absolute inset-x-6 bottom-5 z-20 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver imagen ${i + 1} de ${count}`}
                aria-current={i === active}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(28,43,32,0.14)] transition hover:bg-[rgba(28,43,32,0.26)]"
              >
                <span
                  className={`block h-full rounded-full bg-accent ${
                    i === active
                      ? autoplaying
                        ? "gallery-progress"
                        : "w-full"
                      : "w-0"
                  }`}
                  style={
                    i === active && autoplaying
                      ? ({ "--gal-dur": `${AUTOPLAY_MS}ms` } as React.CSSProperties)
                      : undefined
                  }
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {count > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slides.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver ${name}, imagen ${i + 1} de ${count}`}
              aria-pressed={i === active}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                i === active
                  ? "border-accent ring-2 ring-accent/35"
                  : "border-[var(--line)] hover:border-accent/60"
              }`}
            >
              <ProductImage
                src={src}
                alt=""
                seed={`${slug}-thumb-${i}`}
                fit="contain"
                className="mix-blend-multiply p-1.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({
  dir,
  onClick,
  className = "",
}: {
  dir: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Imagen anterior" : "Imagen siguiente"}
      className={`absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(28,43,32,0.1)] bg-white/85 text-ink/70 shadow-[0_8px_22px_-12px_rgba(110,10,6,0.6)] backdrop-blur-sm transition hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
