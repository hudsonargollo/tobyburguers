import type { Metadata } from "next";
import { OrnateFrame } from "@/components/ornate-frame";
import { BrandLogo } from "@/components/brand/logo";
import { CustomDesignForm } from "@/components/custom-design-form";
import { getStoreSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/settings-shared";

export const metadata: Metadata = {
  alternates: { canonical: "/custom" },
  title: "Pedidos para eventos",
  description: "Combos y pedidos por volumen para cumpleaños, eventos y empresas en Toby ¡Mi Hamburguesa!.",
};

const STEPS = [
  { n: "1", title: "Cuéntanos tu evento", body: "Cuántas personas son, qué te gustaría y para qué fecha lo necesitas." },
  { n: "2", title: "Armamos tu combo", body: "Coordinamos disponibilidad, opciones, precio y un horario estimado de entrega o retiro." },
  { n: "3", title: "Lo disfrutan", body: "Preparamos tu pedido según lo coordinado; los tiempos estimados dependen de la preparación, la demanda y la distancia." },
];

export default async function CustomPage() {
  const settings = await getStoreSettings();
  return (
    <div className="bg-cream px-5 py-12">
      <OrnateFrame className="mx-auto max-w-4xl bg-panel">
        <div className="px-6 py-16 text-center sm:px-14">
          <BrandLogo className="mx-auto h-12" />
          <span className="eyebrow mt-4 block">Cumpleaños, eventos y empresas</span>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink sm:text-5xl">
            Pedidos para eventos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-ink/80">
            ¿Organizas un cumpleaños, una reunión o un pedido grande para tu equipo? Armamos
            combos a tu medida, con hamburguesas, baldes de pollo broaster, papas y gaseosa
            listos para compartir.
          </p>
          {/* Jumps to the request form further down this page */}
          <a
            href="#design-request"
            className="mt-9 inline-block rounded-full bg-accent px-9 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft"
          >
            Pedir un combo para mi evento
          </a>
          <p className="mt-3 text-xs text-muted">
            Rellena un formulario breve para coordinar tu pedido con nuestro equipo.
          </p>
        </div>
      </OrnateFrame>

      <section className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-lg border border-[var(--line)] bg-cream-soft p-7 text-center"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand font-display text-lg text-accent">
              {s.n}
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      {/* Request form */}
      <section
        id="design-request"
        className="mx-auto mt-14 max-w-4xl scroll-mt-28 rounded-2xl border border-[var(--line)] bg-cream-soft p-6 sm:p-10"
      >
        <div className="text-center">
          <span className="eyebrow">Paso 1</span>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Cuéntanos tu evento</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Completa lo que puedas — nuestro equipo te contactará lo antes posible para coordinar disponibilidad, opciones y precio.
          </p>
        </div>
        <div className="mt-8">
          <CustomDesignForm whatsappUrl={whatsappUrl(settings) || undefined} />
        </div>
      </section>
    </div>
  );
}
