import type { Metadata } from "next";
import Link from "next/link";
import { searchStore } from "@/lib/catalog";
import { getSelectedBranch } from "@/lib/branch";
import { formatPrice } from "@/lib/format";
import { ProductGrid } from "@/components/product-grid";
import { BuscarBox } from "@/components/search/search-box";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 60);
  return {
    robots: { index: false, follow: true },
    title: q ? `Buscar: ${q}` : "Buscar",
    description: "Busca en el menú de Toby ¡Mi Hamburguesa!.",
  };
}

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-surface/70 px-4 py-1.5 text-sm text-ink transition hover:border-accent hover:bg-accent/10";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-strong">
      {children}
    </span>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const result = await searchStore(q, (await getSelectedBranch())?.id);
  const { products, category, corrections, minPrice, maxPrice, onSale, partial, categories, all } = result;
  const live = categories.filter((c) => c.count > 0);

  // Something to show when nothing matched (or nothing was typed yet).
  const needPicks = !q || products.length === 0;
  const picks = needPicks
    ? all
        .filter((p) => p.stock > 0)
        .sort((a, b) => Number(b.featured) - Number(a.featured))
        .slice(0, 4)
    : [];
  // "Under Bs …" chip a little above the cheapest piece, rounded to 500.
  const cheapest = all.length ? Math.min(...all.map((p) => p.price)) : 0;
  const budget = Math.ceil((cheapest + 600) / 500) * 500;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
      {/* Hero */}
      {/* No overflow-hidden here: the suggestion panel has to hang out of the hero. */}
      <section className="relative z-30 rounded-3xl border border-[var(--line)] bg-gradient-to-b from-panel/70 via-cream-soft/60 to-transparent px-4 pb-10 pt-12 text-center sm:px-8">
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
          <span className="absolute -top-24 left-1/2 h-56 w-[32rem] max-w-full -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        </span>
        <div className="relative">
          <span className="eyebrow">Encuentra lo que buscas</span>
          <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Busca en el menú</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Escribe un producto, una categoría o un precio — no importa si hay errores de ortografía.
          </p>
          <div className="mt-7">
            <BuscarBox key={q} initial={q} autoFocus={!q} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted">Populares</span>
            {live.map((c) => (
              <Link key={c.slug} href={`/search?q=${encodeURIComponent(c.name.toLowerCase())}`} className={chip}>
                {c.name} <span className="text-xs text-muted">{c.count}</span>
              </Link>
            ))}
            <Link href="/search?q=sale" className={chip}>
              <span className="text-accent-strong">✦</span> En oferta
            </Link>
            {cheapest > 0 && (
              <Link href={`/search?q=${encodeURIComponent(`under ${budget}`)}`} className={chip}>
                Hasta {formatPrice(budget)}
              </Link>
            )}
          </div>
        </div>
      </section>

      {q && (
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-sm text-muted">
                {partial
                  ? "Sin coincidencia exacta — lo más cercano para"
                  : products.length
                    ? `${products.length} producto${products.length === 1 ? "" : "s"} para`
                    : "Buscaste"}{" "}
                <span className="font-display text-xl text-ink">“{q}”</span>
              </p>
              {corrections.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                  Mostrando resultados para{" "}
                  <span className="font-semibold text-accent-strong">{corrections.map((c) => c.to).join(", ")}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {category && <Tag>Categoría · {category.name}</Tag>}
              {onSale && <Tag>En oferta</Tag>}
              {minPrice != null && <Tag>Desde {formatPrice(minPrice)}</Tag>}
              {maxPrice != null && <Tag>Hasta {formatPrice(maxPrice)}</Tag>}
              {category && category.count > 0 && (
                <Link href={`/shop/${category.slug}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-brand underline-offset-4 hover:underline dark:text-accent-soft">
                  Ver todo en {category.name} →
                </Link>
              )}
            </div>
          </div>

          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-cream-soft via-surface to-panel px-6 py-12 text-center">
              <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/20 blur-2xl" aria-hidden="true" />
              <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/60 text-2xl text-accent-strong">✦</span>
              {category && category.count === 0 ? (
                <>
                  <h2 className="relative mt-4 font-display text-2xl text-ink">Nuestra categoría {category.name} está llegando pronto</h2>
                  <p className="relative mx-auto mt-2 max-w-md text-sm text-muted">
                    Esto se está preparando ahora. Recibe un aviso en cuanto esté disponible — o explora el
                    menú abajo.
                  </p>
                  <Link href={`/shop/${category.slug}`} className="relative mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft">
                    Avísame cuando llegue
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="relative mt-4 font-display text-2xl text-ink">Todavía no hay resultados para “{q}”</h2>
                  <p className="relative mx-auto mt-2 max-w-md text-sm text-muted">
                    Escribe el nombre de un producto, la categoría o un precio — la ortografía no importa.
                  </p>
                </>
              )}
              <p className="relative mt-6 text-sm text-muted">
                ¿Buscas algo para tu evento?{" "}
                <Link href="/custom" className="font-semibold text-brand underline underline-offset-4 dark:text-accent-soft">
                  Pídelo como pedido para evento
                </Link>
              </p>
            </div>
          )}
        </section>
      )}

      {picks.length > 0 && (
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <span className="eyebrow">{q ? "Te puede interesar" : "Lo más pedido"}</span>
              <h2 className="mt-2 font-display text-3xl text-ink">{q ? "Recomendados para ti" : "Más populares"}</h2>
            </div>
            <Link href="/shop" className="text-sm text-accent-strong hover:underline">
              Ver todo →
            </Link>
          </div>
          <ProductGrid products={picks} />
        </section>
      )}
    </div>
  );
}
