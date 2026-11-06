"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand/logo";

// Weekly-offer carousel: the copy and the photography rotate together like a
// slideshow (seamless two-way loop, arrows, dots, autoplay progress, pause).
// The offers below come from Toby's own posts; prices change, so treat them as
// editable content (Admin → Productos) rather than part of the printed menu.
const SLIDES: {
  src: string;
  focus: string;
  label: string;
  title: string;
  copy: string;
  cta: string;
  href: string;
}[] = [
  {
    src: "/imgs/promo-slide-1.webp",
    focus: "center 40%",
    label: "Martes de Toby",
    title: "Trimax 2× a Bs 68",
    copy: "Dos hamburguesas triples con queso, cada una con sus papas fritas y su gaseosa. Solo los martes, en local o con delivery.",
    cta: "Ver la Trimax",
    href: "/shop/clasicas",
  },
  {
    src: "/imgs/promo-slide-2.webp",
    focus: "center 40%",
    label: "Martes de Toby",
    title: "2 Clásicas a Bs 44",
    copy: "La Clásica de siempre —pan de sésamo, queso, lechuga, tomate y pepinillo— por Bs 22 cada una los martes.",
    cta: "Ver las clásicas",
    href: "/shop/clasicas",
  },
  {
    src: "/imgs/promo-slide-3.webp",
    focus: "center 50%",
    label: "Todos los días",
    title: "Doble Toby a Bs 28",
    copy: "Doble carne con queso, lechuga y tomate a Bs 28 en Santa Cruz (Bs 27 en La Paz y El Alto).",
    cta: "Ver el menú",
    href: "/shop/clasicas",
  },
  {
    src: "/imgs/promo-slide-4.webp",
    focus: "center 50%",
    label: "Para compartir",
    title: "Balde de broaster",
    copy: "Balde de 6 piezas a Bs 130 o de 10 piezas a Bs 160, con papas y arroz. Rinde para toda la mesa.",
    cta: "Ver los baldes",
    href: "/shop/pollo",
  },
  {
    src: "/imgs/promo-slide-5.webp",
    focus: "center 50%",
    label: "Para cerrar",
    title: "Milk Shake a Bs 26",
    copy: "Café, frutilla, Oreo o chocolate. También en cono, Fruggy y sundae desde Bs 8.",
    cta: "Ver los postres",
    href: "/shop/postres",
  },
];

const INTERVAL = 5200;
const N = SLIDES.length;
const TOTAL = N + 2; // clones at both ends for a seamless two-way loop
const TRACK = [SLIDES[N - 1], ...SLIDES, SLIDES[0]];

export function PromoSlider() {
  const [index, setIndex] = useState(1); // 1..N are the real slides
  const [anim, setAnim] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const touchX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setAnim(true);
    setIndex((i) => i + 1);
  }, []);
  const goPrev = useCallback(() => {
    setAnim(true);
    setIndex((i) => i - 1);
  }, []);

  useEffect(() => {
    if (!playing || hovered) return;
    const id = setInterval(goNext, INTERVAL);
    return () => clearInterval(id);
  }, [playing, hovered, goNext]);

  // re-enable animation on the frame after a seamless snap disabled it
  useEffect(() => {
    if (anim) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    return () => cancelAnimationFrame(r);
  }, [anim]);

  // when a clone finishes showing, snap (without anim) to its real twin
  const handleTransitionEnd = () => {
    if (index === TOTAL - 1) {
      setAnim(false);
      setIndex(1);
    } else if (index === 0) {
      setAnim(false);
      setIndex(N);
    }
  };

  const activeDot = (index - 1 + N) % N;
  const slide = SLIDES[activeDot];
  const autoplaying = playing && !hovered;

  return (
    <section
      className="relative overflow-hidden bg-brand text-light"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ── Text panel ── */}
        <div className="relative z-10 order-2 flex flex-col items-center justify-center px-6 py-16 text-center lg:order-1 lg:items-start lg:px-14 lg:py-24 lg:text-left">
          <BrandLogo className="h-10" />

          <div key={activeDot} className="contents">
            <span className="slide-text-in eyebrow mt-4 block text-accent-soft">
              Ofertas de la semana
            </span>
            <h2
              className="slide-text-in mt-3 max-w-[16ch] font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl"
              style={{ animationDelay: "60ms" }}
            >
              {slide.title}
            </h2>
            <p
              className="slide-text-in mt-4 max-w-md text-pretty text-light/80"
              style={{ animationDelay: "130ms" }}
            >
              {slide.copy}
            </p>

            <Link
              href={slide.href}
              className="slide-text-in mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-9 py-3.5 text-sm font-bold text-brand-deep shadow-[0_18px_40px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft"
              style={{ animationDelay: "200ms" }}
            >
              {slide.cta}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Controls — arrows, progress, dots, pause */}
          <div className="mt-9 flex w-full max-w-[18rem] items-center justify-center gap-3 sm:max-w-xs lg:max-w-none lg:justify-start">
            <ArrowButton dir="prev" onClick={goPrev} />

            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 lg:hidden" aria-live="polite">
              <span className="font-display text-sm font-semibold tracking-[0.12em] text-light/85 [font-variant-numeric:tabular-nums]">
                <span className="text-accent-soft">{String(activeDot + 1).padStart(2, "0")}</span>
                <span className="mx-1.5 text-light/40">/</span>
                {String(N).padStart(2, "0")}
              </span>
              <span className="h-0.5 w-full max-w-[9rem] overflow-hidden rounded-full bg-light/20">
                <span
                  key={`${activeDot}-${autoplaying}`}
                  className={`block h-full origin-left rounded-full bg-accent ${autoplaying ? "gallery-progress" : "w-full"}`}
                  style={
                    autoplaying
                      ? ({ "--gal-dur": `${INTERVAL}ms` } as React.CSSProperties)
                      : undefined
                  }
                />
              </span>
            </div>

            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              {SLIDES.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setAnim(true);
                    setIndex(i + 1);
                  }}
                  aria-label={`Ir a ${s.label}`}
                  aria-current={i === activeDot}
                  title={s.label}
                  className={`h-2 rounded-full transition-all ${
                    i === activeDot ? "w-7 bg-accent" : "w-2 bg-light/40 hover:bg-light/70"
                  }`}
                />
              ))}
            </div>

            <ArrowButton dir="next" onClick={goNext} />
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pausar las ofertas" : "Reproducir las ofertas"}
              aria-pressed={!playing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-light/70 transition hover:bg-light/10 hover:text-accent-soft"
            >
              {playing ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Image slider ── */}
        <div
          className="relative order-1 min-h-[62vh] touch-pan-y overflow-hidden lg:order-2 lg:min-h-[600px]"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
            setHovered(true);
          }}
          onTouchEnd={(e) => {
            const start = touchX.current;
            touchX.current = null;
            setHovered(false);
            if (start == null) return;
            const dx = e.changedTouches[0].clientX - start;
            if (Math.abs(dx) > 40) (dx < 0 ? goNext : goPrev)();
          }}
        >
          <div
            className="flex h-full"
            onTransitionEnd={handleTransitionEnd}
            style={{
              width: `${TOTAL * 100}%`,
              transform: `translateX(-${(index * 100) / TOTAL}%)`,
              transition: anim ? "transform 900ms cubic-bezier(0.4,0,0.2,1)" : "none",
            }}
          >
            {TRACK.map((s, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-full bg-cover"
                style={{
                  width: `${100 / TOTAL}%`,
                  backgroundImage: Math.abs(i - index) <= 1 ? `url(${s.src})` : undefined,
                  backgroundPosition: s.focus,
                }}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(110,10,6,0.65) 0%, rgba(110,10,6,0.15) 24%, rgba(110,10,6,0) 48%), linear-gradient(180deg, rgba(110,10,6,0.10) 0%, rgba(110,10,6,0.30) 100%)",
            }}
          />
          <span className="absolute bottom-6 right-6 rounded-full bg-cream/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-deep">
            {slide.label}
          </span>
        </div>
      </div>

      {/* Thin accent inset frame around the whole band */}
      <div className="pointer-events-none absolute inset-4 z-10 border border-[rgba(245,216,91,0.35)] sm:inset-6" />
    </section>
  );
}

function ArrowButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Oferta anterior" : "Oferta siguiente"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(245,216,91,0.5)] text-accent-soft transition hover:border-accent hover:bg-accent hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
