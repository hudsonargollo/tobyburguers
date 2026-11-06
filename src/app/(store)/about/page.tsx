import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { SplitText } from "@/components/text-reveal";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "Nosotros",
  description: "Toby nació el 11 de octubre de 1981 en la calle Sucre, Santa Cruz. Tres generaciones de la familia Pacheco, la receta original y delivery con AutoToby y PedidosYa.",
};

// Story sourced from public mentions of the brand, pending the client's
// confirmation (see toby-menu/content/nosotros.md). No branch count is claimed.
const PILLARS = [
  { title: "Receta de familia", body: "Tres generaciones sosteniendo la misma fórmula desde 1981: pan con sésamo, carne a la parrilla y el aderezo de la casa." },
  { title: "Para compartir", body: "Baldes de 6 y 10 piezas, cajas Boxy y combos que rinden para dos. La mesa larga también es parte del menú." },
  { title: "Abierto cuando hace falta", body: "Delivery propio con AutoToby, PedidosYa y atención de trasnoche en Santa Cruz." },
];

export default function AboutPage() {
  return (
    <div className="bg-cream px-5 py-12">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--line)] bg-panel">
        <div className="px-6 py-16 text-center sm:px-14">
          <BrandLogo className="mx-auto h-14" />
          <span className="eyebrow mt-5 block">Nuestra historia</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink text-balance sm:text-5xl">
            <SplitText text="Desde 1981," />{" "}
            <span className="text-brand">la hamburguesa de la ciudad</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-ink/80">
            Un 11 de octubre de 1981, en un local pequeño de la calle Sucre, en el centro de
            Santa Cruz, Carol Pacheco Llerena abrió las puertas del primer Toby. Eran quince
            personas, casi todas de la familia, con una sola receta propia y la idea de que la
            ciudad probara algo distinto.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-ink/80">
            La gente volvió, lo contó y Toby creció barrio por barrio: de la calle Sucre a
            otros puntos de Santa Cruz y después a La Paz, con el mismo compromiso de siempre
            y ese sabor único y característico en cada hamburguesa. Tres generaciones de la
            familia Pacheco después, seguimos haciendo lo mismo.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-ink/80">
            Pide para retirar en tu sucursal, o pide delivery por AutoToby o por PedidosYa. En
            Santa Cruz, el local de la Av. Cristóbal de Mendoza (2do anillo) atiende de
            trasnoche. Elige tu sucursal, arma tu combo —de la Clásica al Balde para
            compartir— y nosotros nos encargamos del resto.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-block rounded-full bg-accent px-8 py-3 text-sm font-semibold text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft"
          >
            Ver el menú
          </Link>
        </div>
      </div>

      <section className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="text-center">
            <h3 className="font-display text-xl font-bold text-ink">{p.title}</h3>
            <p className="mt-2 text-sm text-muted">{p.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
