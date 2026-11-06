"use client";

import { useActionState, useEffect } from "react";
import { ChickenMark } from "./brand/emblem";
import { BrandLogo } from "./brand/logo";
import { useToast } from "@/components/ui/toast";
import { subscribe, type InboundState } from "@/app/(store)/inbound-actions";

const initial: InboundState = {};

export function Newsletter() {
  const [state, formAction, pending] = useActionState(subscribe, initial);
  const sent = Boolean(state.ok);
  const toast = useToast();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success("Ya estás en la lista — gracias por sumarte a Toby.", { title: "Suscrito" });
  }, [state, toast]);

  return (
    <section className="bg-panel px-5 py-20">
      {/* Deep-blue card floating on the light panel */}
      <div
        className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[rgba(245,216,91,0.4)] px-6 py-12 text-center shadow-[0_40px_90px_-40px_rgba(0,0,0,0.5)] sm:px-14 sm:py-14"
        style={{ background: "linear-gradient(160deg, #6e0a06 0%, #b81610 55%, #e0231a 100%)" }}
      >
        {/* accent glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(60% 55% at 50% 0%, rgba(245,216,91,0.18), transparent 70%)",
          }}
        />
        {/* top accent + inner frame */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="pointer-events-none absolute inset-4 rounded-xl border border-[rgba(245,216,91,0.2)]" />
        {/* faint watermark */}
        <ChickenMark
          size={320}
          accent="transparent"
          className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 text-light/[0.06]"
        />

        <div className="relative">
          <BrandLogo className="mx-auto h-11" />
          <span className="mt-4 block text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
            Novedades
          </span>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-light sm:text-4xl">
            Promos y novedades en tu correo
          </h2>
          <p className="mx-auto mt-3 max-w-md text-light/70">
            Recibe primero las promos de la semana, los combos nuevos y los cupones de
            Toby.
          </p>

          {sent ? (
            <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-2 rounded-full border border-[rgba(245,216,91,0.4)] bg-[rgba(255,255,255,0.05)] px-6 py-3.5 text-sm text-light">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-soft)" strokeWidth="2.4">
                <path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ¡Gracias por suscribirte!
            </div>
          ) : (
            <form action={formAction} className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
              <input type="hidden" name="source" value="newsletter" />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <input
                type="email"
                name="email"
                required
                placeholder="Ingresa tu correo"
                aria-label="Correo electrónico"
                className="w-full rounded-full border border-[rgba(245,216,91,0.35)] bg-[rgba(255,255,255,0.06)] px-5 py-3.5 text-sm text-light outline-none transition placeholder:text-light/50 focus:border-accent-soft focus:bg-[rgba(255,255,255,0.1)]"
              />
              <button
                type="submit"
                disabled={pending}
                className="shrink-0 rounded-full bg-accent px-8 py-3.5 text-sm font-bold uppercase tracking-[0.08em] text-brand-deep transition hover:bg-accent-soft disabled:opacity-60"
              >
                {pending ? "Enviando…" : "Suscribirse"}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-light/45">Sin spam. Solo promos ricas y novedades de la tienda.</p>
        </div>
      </div>
    </section>
  );
}
