import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { getSelectedBranch } from "@/lib/branch";
import { MenuPromoSlider } from "@/components/shop/menu-promo-slider";
import { MenuSection } from "@/components/shop/menu-section";

export const metadata: Metadata = {
  alternates: { canonical: "/shop" },
  title: "Menú: hamburguesas, combos, Philly y postres",
  description:
    "Hamburguesas premium, clásicas y combos, sándwiches Philly, Boxy Toby, pollo broaster, nuggets, alitas y postres de Toby ¡Mi Hamburguesa!. Pide online con delivery o retiro en tienda en Santa Cruz.",
};

export const dynamic = "force-dynamic";

// Editorial copy per category, in the order the menu shows them.
const SECTIONS: Record<string, { eyebrow: string; blurb: string; order: number }> = {
  premium: { eyebrow: "Las dobles", blurb: "Pan brioche, doble carne y cheddar. Las que no se piden un día cualquiera.", order: 1 },
  express: { eyebrow: "El día a día", blurb: "La hamburguesa de siempre, lista rápido y al precio de siempre.", order: 2 },
  clasicas: { eyebrow: "Lo nuestro", blurb: "Las que hicieron conocer a Toby desde 1981, solas o en combo con papas fritas y gaseosa.", order: 3 },
  plato: { eyebrow: "En mesa", blurb: "Hamburguesa simple servida en plato, con ensalada y arroz. Para comer sin prisa.", order: 4 },
  philly: { eyebrow: "Pan largo", blurb: "Sándwich Philly de pollo o de carne, con champiñones y queso derretido.", order: 5 },
  boxy: { eyebrow: "Para llevar", blurb: "Caja Boxy: hamburguesa o nuggets con papas fritas y gaseosa de 300 ml.", order: 6 },
  pollo: { eyebrow: "Para compartir", blurb: "Broaster, brasa, pipocas y baldes de 6 o 10 piezas con papas y arroz.", order: 7 },
  "nuggets-alitas": { eyebrow: "Crocante", blurb: "Nuggets y alitas con salsa y papas, del paquete chico al grande.", order: 8 },
  postres: { eyebrow: "Para cerrar", blurb: "Conos, Fruggy, milk shakes y sundae en sabores de la casa.", order: 9 },
};

export default async function ShopPage() {
  const branch = await getSelectedBranch();
  const [products, categories] = await Promise.all([getProducts({}, branch?.id), getCategories()]);
  const orderOf = (slug: string) => SECTIONS[slug]?.order ?? 99;
  const sections = [...categories]
    .filter((c) => products.some((p) => p.category.slug === c.slug))
    .sort((a, b) => orderOf(a.slug) - orderOf(b.slug) || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <span className="eyebrow">El menú</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance sm:text-5xl lg:text-6xl">
          La hamburguesa, bien hecha
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base text-muted sm:text-lg">
          Acá no se pide cualquier hamburguesa: se pide Toby ¡Mi Hamburguesa!. Carne a punto,
          pan tostado y el aderezo de la casa. Elige tu línea —premium, clásica, plato o
          Philly— y arma el combo con papas y gaseosa.
        </p>
      </header>

      <div className="mt-10">
        <MenuPromoSlider />
      </div>

      <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
        {sections.map((c) => (
          <MenuSection
            key={c.slug}
            id={c.slug}
            eyebrow={SECTIONS[c.slug]?.eyebrow ?? c.name}
            title={c.name}
            description={SECTIONS[c.slug]?.blurb ?? c.description ?? ""}
            href={`/shop/${c.slug}`}
            linkLabel={`Ver ${c.name.toLowerCase()}`}
            products={products.filter((p) => p.category.slug === c.slug)}
          />
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-[var(--line)] bg-surface py-16 text-center">
          <p className="font-display text-xl text-ink">El menú está tomando forma</p>
          <p className="mt-1 text-sm text-muted">Vuelve en un momento.</p>
        </div>
      ) : null}
    </div>
  );
}
