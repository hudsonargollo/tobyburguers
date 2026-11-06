import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/logo";

export const metadata: Metadata = {
  alternates: { canonical: "/care" },
  title: "Ingredientes y cuidado",
  description: "Ingredientes, alergias y cómo disfrutar tu pedido de Toby ¡Mi Hamburguesa! en su punto.",
};

const TIPS = [
  {
    title: "Come mientras está caliente",
    body: "La hamburguesa y las papas se disfrutan mejor recién hechas. Si recoges en tienda, te avisamos apenas tu pedido esté listo.",
  },
  {
    title: "Ingredientes a la vista",
    body: "Cada combo detalla sus ingredientes en el menú. Si tienes dudas sobre un producto, pregúntanos antes de pedir.",
  },
  {
    title: "Alergias y restricciones",
    body: "Trabajamos con pan de hamburguesa, lácteos como el cheddar y la mozzarella, huevo en el aderezo de la casa, y tocino. Avísanos al confirmar tu pedido si tienes alguna alergia o restricción.",
  },
  {
    title: "Los complementos",
    body: "Las gaseosas que incluye cada combo salen bien frías de la cámara. Mantén el frío hasta servir para que conserven todo su sabor.",
  },
  {
    title: "Sobrantes y conservación",
    body: "Si te sobra algo, refrigéralo dentro de las 2 horas y consúmelo dentro de las siguientes 24. Recuerda recalentar bien antes de comer.",
  },
  {
    title: "¿Un problema con tu pedido?",
    body: "Escríbenos por WhatsApp con tu número de pedido y lo resolvemos. Tu compra está respaldada.",
  },
];

export default function CarePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <div className="text-center">
        <BrandLogo className="mx-auto h-10" />
        <span className="eyebrow mt-3 block">Ayuda</span>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
          Ingredientes y cuidado
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Todo lo que necesitas saber para disfrutar tu pedido tal como salió de la parrilla.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {TIPS.map((t) => (
          <div key={t.title} className="rounded-xl border border-[var(--line)] bg-cream-soft p-6">
            <h2 className="font-display text-xl font-bold text-ink">{t.title}</h2>
            <p className="mt-2 text-sm text-ink/80">{t.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
