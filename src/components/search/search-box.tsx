"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatPrice, discountPercent } from "@/lib/format";
import { ProductImage } from "@/components/product-image";

// Large search field with instant suggestions (debounced /api/search): matching
// category, the top pieces with photo + price, and "see all". Arrow keys move,
// Enter opens, Esc closes. Without JS it is a plain GET form to /search.

type Suggest = {
  total: number;
  partial: boolean;
  correction: string | null;
  category: { name: string; slug: string; count: number } | null;
  products: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    price: number;
    compareAtPrice: number | null;
    category: string;
    soldOut: boolean;
  }[];
};

const EXAMPLES = ["toby cheese doble", "clásica", "combo", "trimax", "balde", "sundae"];

export function BuscarBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(initial);
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = q.trim();

  // Rotating example in the placeholder.
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Debounced suggestions.
  useEffect(() => {
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setData((await res.json()) as Suggest);
          setActive(-1);
        }
      } catch {
        /* aborted or offline — keep the last suggestions */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const shown = term && data ? data : null;
  // Keyboard targets: category row (if any), each product, then "see all".
  const links: string[] = shown
    ? [
        ...(shown.category && shown.category.count > 0 ? [`/shop/${shown.category.slug}`] : []),
        ...shown.products.map((p) => `/product/${p.slug}`),
        `/search?q=${encodeURIComponent(term)}`,
      ]
    : [];
  const catOffset = shown?.category && shown.category.count > 0 ? 1 : 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!links.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % links.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? links.length - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      go(links[active]);
    }
  }

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(listId)?.querySelectorAll('[role="option"]')[active]?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const rowCls = (i: number) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active === i ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-accent/10"}`;

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-2xl">
      <form
        action="/search"
        method="get"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (term) go(`/search?q=${encodeURIComponent(term)}`);
          else inputRef.current?.focus();
        }}
        className="group relative flex items-center rounded-full border border-[var(--line-strong)] bg-surface p-1.5 pl-5 shadow-[0_18px_44px_-28px_rgba(110,10,6,0.55)] transition focus-within:border-accent focus-within:ring-4 focus-within:ring-[rgba(232,190,26,0.18)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5 shrink-0 text-accent-strong" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" />
        </svg>
        <input
          ref={inputRef}
          name="q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) setData(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={`Prueba “${EXAMPLES[hint]}”`}
          aria-label="Buscar en el menú"
          role="combobox"
          aria-expanded={open && !!shown}
          aria-controls={listId}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-ink outline-none placeholder:text-muted/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <span className="mr-2 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent" aria-hidden="true" />}
        {q && !loading && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setData(null);
              inputRef.current?.focus();
            }}
            aria-label="Borrar búsqueda"
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-accent/10 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className="shrink-0 rounded-full bg-gradient-to-r from-accent-soft via-accent to-accent-strong px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-brand shadow-[0_10px_24px_-12px_rgba(232,190,26,0.9)] transition hover:brightness-105 sm:px-7"
        >
          Buscar
        </button>
      </form>

      {open && shown && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-surface text-left shadow-[0_30px_60px_-30px_rgba(110,10,6,0.7)] animate-chatin [transform-origin:top_center]"
        >
          {shown.correction && (
            <p className="border-b border-[var(--line)] px-4 py-2.5 text-xs text-muted">
              Mostrando resultados para <span className="font-semibold text-accent-strong">“{shown.correction}”</span>
            </p>
          )}

          <div className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
            {shown.category && shown.category.count > 0 && (
              <Link href={`/shop/${shown.category.slug}`} role="option" aria-selected={active === 0} onClick={() => setOpen(false)} className={rowCls(0)}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-soft via-accent to-accent-strong text-brand">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                    <path d="M7 5h10l4 5-9 10L3 10z" />
                    <path d="M3 10h18M10 5 8.6 10 12 20l3.4-10L14 5" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">Ver todo en {shown.category.name}</span>
                  <span className="block text-xs text-muted">
                    {shown.category.count} producto{shown.category.count === 1 ? "" : "s"} en el menú
                  </span>
                </span>
                <span className="text-accent-strong">→</span>
              </Link>
            )}

            {shown.category && shown.category.count === 0 && (
              <Link href={`/shop/${shown.category.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-accent/10">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-accent/60 text-lg text-accent-strong">✦</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{shown.category.name} llega pronto</span>
                  <span className="block text-xs text-muted">Toca para avisarte cuando llegue</span>
                </span>
              </Link>
            )}

            {shown.products.length > 0 && (
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
                {shown.partial ? "Coincidencias cercanas" : "Del menú"}
              </p>
            )}
            {shown.products.map((p, i) => {
              const idx = i + catOffset;
              const off = discountPercent(p.price, p.compareAtPrice);
              return (
                <Link key={p.id} href={`/product/${p.slug}`} role="option" aria-selected={active === idx} onClick={() => setOpen(false)} className={rowCls(idx)}>
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-sand">
                    <ProductImage src={p.image ?? undefined} alt="" seed={p.slug} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {p.category}
                      {p.soldOut && <span className="ml-1.5 text-bad">· Agotado</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-sm font-semibold ${off ? "text-brand dark:text-accent-soft" : "text-ink"}`}>{formatPrice(p.price)}</span>
                    {off && <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-accent-strong">{off}% off</span>}
                  </span>
                </Link>
              );
            })}

            {shown.total === 0 && !shown.category && (
              <div className="px-3 py-5 text-center">
                <p className="font-display text-lg text-ink">Todavía no hay nada para “{term}”</p>
                <p className="mt-1 text-xs text-muted">Escribe el nombre de un producto, una categoría o una promo.</p>
              </div>
            )}
          </div>

          {shown.total > 0 && (
            <Link
              href={`/search?q=${encodeURIComponent(term)}`}
              role="option"
              aria-selected={active === links.length - 1}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between border-t border-[var(--line)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                active === links.length - 1 ? "bg-brand text-light" : "text-brand hover:bg-accent/10 dark:text-accent-soft"
              }`}
            >
              Ver los {shown.total} resultado{shown.total === 1 ? "" : "s"}
              <span>→</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
