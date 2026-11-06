"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBrowserLocation, distanceKm, formatDistance, type Coords } from "@/lib/geo";

export type PickerBranch = {
  slug: string;
  name: string;
  address: string;
  city: string;
  whatsapp: string | null;
  hours: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
};

type BranchPickerContextValue = {
  open: (options?: { locate?: boolean }) => void;
  close: () => void;
  isOpen: boolean;
};

const BranchPickerContext = createContext<BranchPickerContextValue | null>(null);

export function useBranchPicker() {
  const ctx = useContext(BranchPickerContext);
  if (!ctx) throw new Error("useBranchPicker must be used inside BranchPickerProvider");
  return ctx;
}

export function BranchPickerProvider({
  branches,
  selectedSlug,
  children,
}: {
  branches: PickerBranch[];
  selectedSlug: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [autoLocate, setAutoLocate] = useState(false);
  const value = useMemo(
    () => ({
      open: (options?: { locate?: boolean }) => {
        setAutoLocate(options?.locate ?? false);
        setOpen(true);
      },
      close: () => setOpen(false),
      isOpen: open,
    }),
    [open]
  );

  return (
    <BranchPickerContext.Provider value={value}>
      {children}
      {open && (
        <BranchPickerDialog
          branches={branches}
          selectedSlug={selectedSlug}
          autoLocate={autoLocate}
          onClose={() => setOpen(false)}
        />
      )}
    </BranchPickerContext.Provider>
  );
}

function BranchPickerDialog({
  branches,
  selectedSlug,
  autoLocate,
  onClose,
}: {
  branches: PickerBranch[];
  selectedSlug: string | null;
  autoLocate: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationFailed(false);
    const found = await getBrowserLocation();
    setLocating(false);
    if (found) setCoords(found);
    else setLocationFailed(true);
  }, []);

  useEffect(() => {
    if (!autoLocate) return;
    // Deferred so geolocation state changes don't cascade synchronously on mount.
    const timer = window.setTimeout(() => void locate(), 120);
    return () => window.clearTimeout(timer);
  }, [autoLocate, locate]);

  const ordered = useMemo(() => {
    if (!coords) return branches.map((branch) => ({ branch, distance: null as number | null }));
    return branches
      .map((branch) => ({
        branch,
        distance:
          branch.latitude != null && branch.longitude != null
            ? distanceKm(coords, { latitude: branch.latitude, longitude: branch.longitude })
            : null,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [branches, coords]);

  const choose = (slug: string) => {
    const next = encodeURIComponent(pathname || "/");
    window.location.assign(`/api/branch?slug=${encodeURIComponent(slug)}&next=${next}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(110,10,6,0.55)] p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-picker-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--line)] bg-surface shadow-[0_30px_90px_-30px_rgba(110,10,6,0.75)] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative bg-brand px-6 pb-6 pt-6 text-light">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full p-2 text-light/70 transition hover:bg-white/10 hover:text-light"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(243,196,187,0.45)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent-soft">
            <PinIcon />
            Dónde te atendemos
          </span>
          <h2 id="branch-picker-title" className="mt-4 pr-8 font-display text-2xl font-semibold leading-tight">
            Elige tu sucursal
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-light/75">
            Prepararemos tu pedido en la tienda que elijas. Puedes cambiarla cuando quieras.
          </p>
        </div>

        {/* Locate */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-cream-soft px-5 py-3.5">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-brand-deep transition hover:bg-accent-soft disabled:opacity-60"
          >
            <CrosshairIcon />
            {locating ? "Ubicándote…" : coords ? "Actualizar ubicación" : "Usar mi ubicación"}
          </button>
          {coords && (
            <span className="text-[0.7rem] font-medium text-muted">
              Ordenado por cercanía
              {coords.accuracy && coords.accuracy > 800
                ? " · ubicación aproximada"
                : ""}
            </span>
          )}
          {locationFailed && (
            <span className="text-[0.7rem] font-medium text-muted">
              No pudimos leer tu ubicación; elige una tienda.
            </span>
          )}
        </div>

        {/* List */}
        <ul className="flex-1 divide-y divide-[var(--line)] overflow-y-auto overscroll-contain">
          {ordered.map(({ branch, distance }, index) => {
            const active = branch.slug === selectedSlug;
            return (
              <li key={branch.slug}>
                <button
                  type="button"
                  onClick={() => choose(branch.slug)}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-cream-soft"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                      active
                        ? "bg-accent text-brand-deep"
                        : "bg-brand/10 text-brand group-hover:bg-brand group-hover:text-light"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{branch.name}</span>
                      {active && (
                        <span className="hidden shrink-0 rounded-full bg-accent/25 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-accent-strong sm:inline">
                          Actual
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {branch.address}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] text-muted">
                      <span>
                        {branch.deliveryEnabled && branch.pickupEnabled
                          ? "Delivery y retiro"
                          : branch.deliveryEnabled
                            ? "Delivery"
                            : branch.pickupEnabled
                              ? "Retiro en tienda"
                              : "Atención en tienda"}
                      </span>
                      {branch.hours && <span>· {branch.hours}</span>}
                    </span>
                  </span>
                  {distance != null && (
                    <span className="shrink-0 rounded-full bg-brand px-2 py-1 text-[0.62rem] font-semibold text-accent-soft">
                      {formatDistance(distance)}
                    </span>
                  )}
                  <ArrowIcon />
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-cream-soft px-5 py-3">
          <Link
            href="/sucursal"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand transition hover:text-accent-strong"
          >
            <MapIcon />
            Ver mapa 3D
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs font-semibold text-muted transition hover:text-ink"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function CrosshairIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hidden shrink-0 text-muted/60 sm:block" aria-hidden="true">
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
