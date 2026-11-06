import type { Metadata } from "next";
import { NotifyForm } from "@/components/notify-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getProducts, getShopFacets } from "@/lib/catalog";
import { getSelectedBranch } from "@/lib/branch";
import { parseProductFilters } from "@/lib/filters";
import { ShopBrowser } from "@/components/shop/shop-browser";
import { BrandLogo } from "@/components/brand/logo";

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "No encontrado" };
  return {
    title: cat.name,
    description: cat.description ?? `Pide ${cat.name.toLowerCase()} en Toby ¡Mi Hamburguesa!.`,
    alternates: { canonical: `/shop/${cat.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const sp = await searchParams;
  const parsed = parseProductFilters(sp);
  const filters = { ...parsed, categorySlug: cat.slug };
  const branch = await getSelectedBranch();
  const [products, facets] = await Promise.all([
    getProducts(filters, branch?.id),
    getShopFacets(cat.slug, branch?.id),
  ]);

  const hasFilters = Boolean(
    parsed.q || parsed.material || parsed.minPrice || parsed.maxPrice || parsed.onSale || parsed.inStock
  );

  // Category with no products yet → friendly "coming soon" card.
  if (products.length === 0 && !hasFilters) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <BrandLogo className="mx-auto h-12" />
        <span className="eyebrow mt-4 block">{cat.name}</span>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Próximamente
        </h1>
        <p className="relative mx-auto mt-2 max-w-md text-muted">
          Estamos preparando nuestra selección de {cat.name.toLowerCase()}. Déjanos tu correo y te
          avisamos en cuanto llegue.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft"
          >
            Ver el menú
          </Link>
        </div>
        <div className="mt-8">
          <p className="mb-3 text-sm text-muted">Avísame cuando lleguen:</p>
          <NotifyForm slug={cat.slug} label={cat.name} />
        </div>
      </div>
    );
  }

  return (
    <ShopBrowser
      eyebrow="El menú"
      title={cat.name}
      description={cat.description}
      products={products}
      facets={facets}
    />
  );
}
