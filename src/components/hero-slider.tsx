"use client";

import { preload } from "react-dom";
import Link from "next/link";
import { RotatingWord, SplitText } from "./text-reveal";
import { useBranchPicker } from "./branch-picker";

const HERO = "/imgs/hero-toby.webp";
const LOGO = "/imgs/logo3d.webp";

export function HeroSlider() {
  // The hero photo is the biggest thing above the fold — fetch it straight away.
  preload(HERO, { as: "image", fetchPriority: "high" });
  preload(LOGO, { as: "image", fetchPriority: "high" });
  const picker = useBranchPicker();

  return (
    <section className="relative overflow-hidden bg-brand text-light">
      {/* Slide */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO})` }}
      />
      {/* Readability overlay: deep brand red on the left, clearing toward the grill */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(110,10,6,0.95) 0%, rgba(110,10,6,0.8) 40%, rgba(110,10,6,0.35) 68%, rgba(110,10,6,0.12) 100%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-brand/55 lg:hidden" />

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-36">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          {/* Brand — the 3D logo is the first thing in the hero. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO}
            alt="Toby ¡Mi Hamburguesa!"
            width={1200}
            height={488}
            className="mx-auto h-24 w-auto drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)] sm:h-28 lg:mx-0 lg:h-32"
          />
          <span className="mt-6 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-soft" aria-hidden="true" />
            Santa Cruz · desde 1981
          </span>
          <h1 className="mt-3 max-w-[19ch] font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-balance sm:text-5xl lg:text-[4rem]">
            <SplitText text="La hamburguesa" delay={80} />{" "}
            <RotatingWord
              words={["de la ciudad", "de siempre", "para compartir"]}
              className="text-accent-soft"
            />
          </h1>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-light/85">
            Línea premium, clásicas, combos con papas y gaseosa, baldes y postres.
            Pide en línea y recibe con AutoToby o retira en tu sucursal.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/shop"
              className="inline-block rounded-full bg-accent px-8 py-3.5 text-sm font-bold text-brand-deep shadow-[0_18px_40px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft"
            >
              Ver el menú
            </Link>
            <button
              type="button"
              onClick={() => picker.open({ locate: true })}
              className="inline-block rounded-full border border-light/50 px-8 py-3.5 text-sm font-semibold text-light transition hover:border-accent-soft hover:bg-light/5 hover:text-accent-soft"
            >
              Encontrar sucursal
            </button>
          </div>

          <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-light/60">
            Delivery y retiro en tienda · Pago contra entrega
          </p>
        </div>
      </div>
    </section>
  );
}
