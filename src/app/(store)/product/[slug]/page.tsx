import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { getSelectedBranch } from "@/lib/branch";
import { formatPrice, discountPercent, visiblePack } from "@/lib/format";
import { ProductGallery } from "@/components/product-gallery";
import { getStoreSettings } from "@/lib/settings";
import { pointRuleLabel, stampEligible, stampRuleLabel } from "@/lib/loyalty-shared";
import { ProductCard } from "@/components/product-card";
import { DealPanel } from "@/components/ui/sale-badge";
import { AddToCart } from "@/components/cart/add-to-cart";
import { JsonLd } from "@/components/json-ld";
import { SplitText } from "@/components/text-reveal";

import { siteUrl } from "@/lib/site";
import { AccordionItem } from "@/components/ui/accordion-item";
import { toCartLine } from "@/lib/cart";

// Stock and shipping depend on the shopper's branch cookie, so this route is
// rendered per request. Product data itself stays cached by tag in lib/catalog.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "No encontrado" };
  const description = product.description ?? `${product.name} — disponible en Toby ¡Mi Hamburguesa!.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} · Toby ¡Mi Hamburguesa!`,
      description,
      type: "website",
      url: `${siteUrl}/product/${product.slug}`,
      images: product.images.length ? product.images : undefined,
    },
  };
}

/** Returns a short neutral attribute note inferred from the product description. */
function attributeOf(text: string): string | null {
  if (/vegetarian|veggie/i.test(text)) return "Veggie";
  if (/pollo|alitas|nuggets|broaster/i.test(text)) return "Pollo";
  if (/philly|champi/i.test(text)) return "Champiñones";
  if (/carne|tocino|panceta|chori/i.test(text)) return "Carne";
  if (/picante|jalape/i.test(text)) return "Picante";
  return null;
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const settings = await getStoreSettings();
  const branch = await getSelectedBranch();
  const DELIVERY_TIME = settings.shipping.deliveryTime;
  const off = discountPercent(product.price, product.compareAtPrice);
  const related = await getRelatedProducts(product, branch?.id);
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= settings.inventory.lowStockThreshold;

  const desc = product.description ?? "";
  const sentences = desc.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
  const lead = sentences.slice(0, 2).join(" ");
  const attribute = attributeOf(desc);
  const pack = visiblePack(product.material);
  const customSpecs: [string, string][] = (product.specs ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf(":");
      return (idx === -1 ? ["Detalle", l] : [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]) as [string, string];
    });
  const hasCustom = customSpecs.length > 0;

  // Compact highlights shown up top (Amazon-style "Top highlights")
  const derivedHighlights: [string, string][] = [
    ["Categoría", product.category.name],
    ...(pack ? ([["Presentación", pack]] as [string, string][]) : []),
    ...(attribute ? ([["Tipo", attribute]] as [string, string][]) : []),
    ["Entrega estimada", DELIVERY_TIME],
  ];
  const highlights = hasCustom ? customSpecs.slice(0, 4) : derivedHighlights;

  // Fuller specification table (inside "Product details")
  const specs: [string, string][] = hasCustom
    ? customSpecs
    : [
        ["Categoría", product.category.name],
        ...(pack ? ([["Presentación", pack]] as [string, string][]) : []),
        ...(attribute ? ([["Tipo", attribute]] as [string, string][]) : []),
        ["Disponibilidad", inStock ? "En stock" : "Agotado"],
        ["Entrega estimada", DELIVERY_TIME],
        ["Pago", "Contra entrega en tu sucursal Toby"],
        ["Atención cuidadosa", "Contáctanos con tu número de pedido"],
      ];

  const aboutBullets = [
    ...sentences,
    "Preparado al momento en tu sucursal Toby.",
    "Pago contra entrega al recibir, o retiro en tienda sin costo.",
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    category: product.category.name,
    ...(pack ? { material: pack } : {}),
    ...(product.images.length ? { image: product.images } : {}),
    brand: { "@type": "Brand", name: "Toby ¡Mi Hamburguesa!" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BOB",
      price: product.price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${siteUrl}/product/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
      <JsonLd data={productJsonLd} />
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link href="/shop" className="hover:text-accent-strong">Menú</Link>
        <span className="mx-2">/</span>
        <Link href={`/shop/${product.category.slug}`} className="hover:text-accent-strong">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="md:sticky md:top-24 md:self-start">
          <ProductGallery images={product.images} name={product.name} slug={product.slug} />
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted">{product.category.name}</p>
            {product.featured && (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-accent">
                Destacado
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-ink text-balance">
            <SplitText text={product.name} />
          </h1>


          {off && product.compareAtPrice ? (
            <DealPanel price={product.price} compareAt={product.compareAtPrice} percent={off} />
          ) : (
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-ink">{formatPrice(product.price)}</span>
            </div>
          )}

          {lead && <p className="mt-4 max-w-prose text-pretty leading-relaxed text-ink/80">{lead}</p>}

          {/* Top highlights */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[var(--line)] bg-surface/60 p-5">
            {highlights.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted">{k}</dt>
                <dd className="mt-0.5 text-sm text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          {/* Availability */}
          <p className="mt-4 text-sm">
            <span className={inStock ? "font-medium text-green-700" : "font-medium text-red-700"}>
              {inStock ? "En stock" : "Agotado"}
            </span>
            {lowStock && <span className="text-amber-700"> · quedan {product.stock}</span>}
          </p>

          {/* Actions */}
          <div className="mt-5">
            <AddToCart
              product={toCartLine(product)}
            />
          </div>

          {/* Delivery & assurance */}
          <div className="mt-6 space-y-2.5 rounded-xl border border-[var(--line)] p-4 text-sm">
            <Assure icon="scooter">Delivery en Santa Cruz. Entrega estimada: <b className="font-medium text-ink">{DELIVERY_TIME}</b>. También puedes retirar en tu sucursal.</Assure>
            <Assure icon="cash">Pago contra entrega disponible</Assure>
            {settings.loyalty.enabled &&
              stampEligible(
                { productSlug: product.slug, categorySlug: product.category.slug },
                settings.loyalty
              ) && (
                <Assure icon="gift">
                  <Link href="/club-toby" className="font-medium text-accent-strong hover:underline">
                    {settings.loyalty.name}
                  </Link>
                  : {stampRuleLabel(settings.loyalty)} y {pointRuleLabel(settings.loyalty)}.
                </Assure>
              )}
            <Assure icon="return"><b className="font-medium text-ink">Atención cuidadosa</b>: contáctanos con tu número de pedido y lo revisamos lo más rápido posible</Assure>
            <Assure icon="shield">Compra segura y atención directa</Assure>
          </div>
        </div>
      </div>

      {/* ---------- Detailed sections (Amazon-style) ---------- */}
      <section className="mt-14 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Detalles</h2>
          <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            <Accordion title="Detalles y especificaciones" open>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-[var(--line)]/60 pb-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Accordion>

            <Accordion title="Sobre este producto">              <ul className="space-y-2.5">
                {aboutBullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Accordion>

            <Accordion title="Cómo lo preparamos">
              <p>
                Se prepara al momento en tu sucursal Toby y sale directo a tu mesa o a tu
                puerta. Si quieres armar un combo para un evento o un pedido más grande,{" "}
                <Link href="/contact" className="text-accent-strong underline">escríbenos</Link>{" "}
                y lo coordinamos contigo.
              </p>
            </Accordion>

            <Accordion title="Ingredientes y alergias">
              <ul className="space-y-2 [&>li]:flex [&>li]:gap-2.5">
                <li><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" /> Trabajamos con pan de hamburguesa, lácteos como el cheddar y la mozzarella, huevo en el aderezo de la casa, y tocino.</li>
                <li><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" /> Avísanos si tienes alguna alergia o restricción al confirmar tu pedido.</li>
                <li><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" /> Los ingredientes de cada combo están detallados en el menú.</li>
              </ul>
            </Accordion>

            <Accordion title="Delivery y atención cuidadosa">
              <p>
                Entregamos en Santa Cruz con AutoToby o PedidosYa, con{" "}
                <b className="font-medium text-ink">pago contra entrega</b>. Los pedidos se preparan
                al momento y salen de la sucursal que elegiste.
                Si tu pedido llega incompleto o en mal estado, contáctanos con tu{" "}
                <b className="font-medium text-ink">número de pedido</b>. Nos importa que disfrutes
                tu comida. Revisamos lo ocurrido con cuidado y lo más rápido posible para
                coordinar contigo la solución más adecuada.
              </p>
            </Accordion>
          </div>
        </div>

        {/* Sticky assurance rail on desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-[var(--line)] bg-surface p-6 shadow-[0_20px_50px_-40px_rgba(110,10,6,0.5)]">
            <p className="font-display text-xl font-semibold text-ink">¿Por qué Toby ¡Mi Hamburguesa!?</p>
            <ul className="mt-4 space-y-3 text-sm text-ink/80">
              <li className="flex gap-2.5"><Dot /> Todo se prepara al momento en tu sucursal</li>
              <li className="flex gap-2.5"><Dot /> Pago contra entrega en tu sucursal Toby</li>
              <li className="flex gap-2.5"><Dot /> Delivery con entrega estimada: {DELIVERY_TIME}. También puedes retirar en tienda</li>
              <li className="flex gap-2.5"><Dot /> Atención cercana por WhatsApp</li>
            </ul>
          </div>
        </aside>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold text-ink">También te puede gustar</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Accordion({
  title,
  open,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      title={title}
      group="product-details"
      defaultOpen={open}
      summaryClassName="py-4 font-display text-lg font-semibold text-ink"
      icon={
        <svg
          className="shrink-0 text-muted transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]:rotate-180"
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    >
      <div className="pb-5 text-sm leading-relaxed text-ink/80">{children}</div>
    </AccordionItem>
  );
}

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" />;
}

function Assure({ icon, children }: { icon: "scooter" | "cash" | "return" | "shield" | "gift"; children: React.ReactNode }) {
  const paths: Record<string, React.ReactNode> = {
    scooter: (
      <>
        <circle cx="5.5" cy="18" r="2" />
        <circle cx="18.5" cy="18" r="2" />
        <path d="M7.5 18h8.5" />
        <path d="M16 18l2.5-6.5h3" />
        <path d="M8 12h5.5l1 3" />
        <path d="M15 8.5h4" strokeLinecap="round" />
      </>
    ),
    cash: (<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.3" /><path d="M6 9.5v5M18 9.5v5" /></>),
    return: (<><path d="M4 9a8 8 0 1 1-1 4" /><path d="M4 5v4h4" strokeLinecap="round" strokeLinejoin="round" /></>),
    shield: (<><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></>),
    gift: (
      <>
        <path d="M20 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V12" />
        <path d="M2.5 8h19v4h-19z" />
        <path d="M12 8v13" />
        <path d="M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z" />
      </>
    ),
  };
  return (
    <div className="flex items-center gap-3 text-muted">
      <svg className="shrink-0 text-accent-strong" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
      <span className="text-ink/80">{children}</span>
    </div>
  );
}
