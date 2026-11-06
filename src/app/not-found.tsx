import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";

export const metadata = { title: "Página no encontrada", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-20 text-center">
      <BrandLogo className="h-14" />
      <p className="mt-6 font-display text-6xl font-bold text-accent-strong sm:text-7xl">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
        No encontramos esta página
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted">
        La página que buscas puede haberse movido o ya no existe.
        Volvamos a lo que se te antoja.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft"
        >
          Volver al inicio
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-[var(--line-strong)] px-8 py-3 text-sm font-medium uppercase tracking-[0.12em] text-ink transition hover:border-accent hover:text-accent-strong"
        >
          Explorar el menú
        </Link>
      </div>
    </main>
  );
}
