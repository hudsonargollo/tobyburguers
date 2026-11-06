"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { distanceKm, formatDistance, getBrowserLocation, type Coords } from "@/lib/geo";
import type { MapHandle } from "./map-canvas";

export type BranchMapItem = {
  slug: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  image: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
};

const MapStage = dynamic(() => import("./map-stage"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#051a2f]">
      <div className="flex flex-col items-center gap-4 text-light/70">
        <span className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-brand/30">
            <PinIcon className="h-5 w-5 text-accent-soft" />
          </span>
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.22em]">Dibujando Santa Cruz…</p>
      </div>
    </div>
  );
}

export function BranchMapExperience({
  branches,
  selectedSlug,
  next,
  city,
}: {
  branches: BranchMapItem[];
  selectedSlug: string | null;
  next: string;
  city: string;
}) {
  const mapHandle = useRef<MapHandle | null>(null);
  const [selected, setSelected] = useState<string | null>(selectedSlug);
  const [nearest, setNearest] = useState<string | null>(null);
  const [location, setLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  const ordered = useMemo(() => {
    if (!location) return branches.map((branch) => ({ branch, distance: null as number | null }));
    return branches
      .map((branch) => ({
        branch,
        distance:
          branch.latitude != null && branch.longitude != null
            ? distanceKm(location, { latitude: branch.latitude, longitude: branch.longitude })
            : null,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [branches, location]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.slug === selected) ?? null,
    [branches, selected]
  );
  const selectedDistance = useMemo(() => {
    if (!selectedBranch || !location || selectedBranch.latitude == null || selectedBranch.longitude == null) {
      return null;
    }
    return distanceKm(location, {
      latitude: selectedBranch.latitude,
      longitude: selectedBranch.longitude,
    });
  }, [selectedBranch, location]);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationError(false);
    const found = await getBrowserLocation(20000);
    setLocating(false);
    if (!found) {
      setLocationError(true);
      return;
    }
    setLocation(found);

    let best: { slug: string; distance: number } | null = null;
    for (const branch of branches) {
      if (branch.latitude == null || branch.longitude == null) continue;
      const distance = distanceKm(found, {
        latitude: branch.latitude,
        longitude: branch.longitude,
      });
      if (!best || distance < best.distance) best = { slug: branch.slug, distance };
    }
    if (!best) return;
    setNearest(best.slug);
    setSelected((current) => current ?? best.slug);
    window.setTimeout(() => mapHandle.current?.focusBranch(best.slug), 420);
  }, [branches]);

  // Only auto-locate when the browser already granted permission; visiting the
  // map never triggers a fresh permission prompt by itself.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const status = await navigator.permissions?.query({
          name: "geolocation" as PermissionName,
        });
        if (alive && status?.state === "granted") void locate();
      } catch {
        // Permissions API unavailable — wait for the button.
      }
    };
    void check();
    return () => {
      alive = false;
    };
  }, [locate]);

  const pick = useCallback((slug: string) => {
    setSelected(slug);
    mapHandle.current?.focusBranch(slug);
  }, []);

  const chooseHref = (slug: string) =>
    `/api/branch?slug=${encodeURIComponent(slug)}&next=${encodeURIComponent(next)}`;

  const ctaLabel = next.startsWith("/checkout") ? "Continuar al pago" : "Pedir en esta sucursal";

  return (
    <section className="relative isolate h-[calc(100dvh-7rem)] min-h-[340px] overflow-hidden bg-[#051a2f] text-light">
      {branches.length > 0 && (
        <MapStage
          handle={mapHandle}
          branches={branches}
          selectedSlug={selected}
          nearestSlug={nearest}
          userLocation={location}
          onSelect={pick}
        />
      )}

      {/* Vignette + top fade keep the overlays readable over the 3D city */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(75% 70% at 50% 42%, rgba(2,10,20,0) 42%, rgba(2,10,20,0.55) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-[rgba(3,14,26,0.85)] via-[rgba(3,14,26,0.35)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[rgba(3,14,26,0.7)] to-transparent lg:h-28" />

      {/* Title */}
      <div className="absolute left-4 top-4 z-20 max-w-[calc(100%-4.5rem)] sm:left-6 sm:top-6 lg:max-w-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-brand-deep/70 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-accent-soft backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Mapa en vivo · {city || "Santa Cruz"}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold leading-[1.05] tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] sm:text-3xl lg:text-4xl">
          Toda la ciudad,
          <br />
          <span className="text-accent-soft">a un clic de tu Toby.</span>
        </h1>
        <p className="mt-2 hidden max-w-xs text-sm leading-relaxed text-light/70 sm:block">
          Gira el mapa, toca un pin y elige la sucursal que prepara tu pedido. El
          repartidor sale desde la más cercana.
        </p>
      </div>

      {/* Location error */}
      {locationError && (
        <div className="absolute left-1/2 top-4 z-30 w-[min(92%,26rem)] -translate-x-1/2 rounded-2xl border border-accent/35 bg-brand-deep/95 px-4 py-3 text-center text-xs text-light/85 shadow-xl backdrop-blur lg:top-auto lg:bottom-6 lg:left-auto lg:right-24 lg:translate-x-0 lg:text-left">
          No pudimos leer tu ubicación. Actívala en el navegador o elige una
          sucursal en la lista.
        </div>
      )}

      {/* Desktop branch rail */}
      <aside className="absolute bottom-6 left-6 top-[11.5rem] z-20 hidden w-[340px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(6,26,47,0.84)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl lg:flex">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-accent-soft">
              Sucursales
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.62rem] font-semibold text-light/80">
              {branches.length}
            </span>
          </div>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-brand-deep transition hover:bg-accent-soft disabled:opacity-65"
          >
            <CrosshairIcon className={`h-4 w-4 ${locating ? "animate-spin" : ""}`} />
            {locating
              ? "Buscando tu ubicación…"
              : location
                ? "Actualizar mi ubicación"
                : "Usar mi ubicación"}
          </button>
          <p className="mt-2 text-center text-[0.65rem] text-light/55">
            {location ? "Ordenadas de la más cercana a la más lejana" : "El mapa te muestra las 13 tiendas"}
          </p>
        </div>

        <ul className="flex-1 divide-y divide-white/5 overflow-y-auto overscroll-contain">
          {ordered.map(({ branch, distance }, index) => {
            const active = branch.slug === selected;
            const isNearest = branch.slug === nearest;
            return (
              <li key={branch.slug}>
                <button
                  type="button"
                  onClick={() => pick(branch.slug)}
                  className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    active ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-[0.72rem] font-bold ${
                      active
                        ? "bg-accent text-brand-deep"
                        : "bg-white/10 text-light/70 group-hover:bg-brand group-hover:text-light"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[0.82rem] font-semibold text-light">
                        {branch.name}
                      </span>
                      {isNearest && (
                        <span className="shrink-0 rounded-full bg-accent/25 px-1.5 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider text-accent-soft">
                          Cerca
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.7rem] text-light/55">
                      {branch.address}
                    </span>
                  </span>
                  {distance != null && (
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-semibold text-accent-soft">
                      {formatDistance(distance)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-white/10 px-4 py-3">
          <Legend />
        </div>
      </aside>

      {/* Desktop detail card */}
      {selectedBranch && (
        <div className="absolute bottom-6 left-[25rem] z-20 hidden w-[min(26rem,calc(100%-32rem))] lg:block">
          <BranchDetail
            branch={selectedBranch}
            distance={selectedDistance}
            href={chooseHref(selectedBranch.slug)}
            ctaLabel={ctaLabel}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* Map controls */}
      <div className="absolute bottom-[10.5rem] right-3 z-30 flex flex-col gap-2 sm:right-4 lg:bottom-6 lg:right-6">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,26,47,0.85)] shadow-xl backdrop-blur-md">
          <MapButton label="Acercar" onClick={() => mapHandle.current?.zoomBy(0.78)}>
            <PlusIcon />
          </MapButton>
          <span className="mx-2 h-px bg-white/10" />
          <MapButton label="Alejar" onClick={() => mapHandle.current?.zoomBy(1.28)}>
            <MinusIcon />
          </MapButton>
          <span className="mx-2 h-px bg-white/10" />
          <MapButton label="Centrar mapa" onClick={() => mapHandle.current?.resetView()}>
            <TargetIcon />
          </MapButton>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label="Usar mi ubicación"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/40 bg-accent text-brand-deep shadow-lg transition hover:bg-accent-soft disabled:opacity-70"
        >
          <CrosshairIcon className={`h-5 w-5 ${locating ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Mobile sheet */}
      <div className="absolute inset-x-0 bottom-0 z-20 lg:hidden">
        <div className="rounded-t-[1.75rem] border-t border-white/12 bg-[rgba(6,26,47,0.94)] px-4 pb-5 pt-2.5 shadow-[0_-24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-accent-soft">
              {location ? "Ordenado por cercanía" : `${branches.length} sucursales en ${city || "Santa Cruz"}`}
            </p>
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[0.65rem] font-bold text-accent-soft transition disabled:opacity-70"
            >
              <CrosshairIcon className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
              {location ? "Actualizar" : "Mi ubicación"}
            </button>
          </div>

          {selectedBranch ? (
            <div className="mt-2.5">
              <BranchDetail
                branch={selectedBranch}
                distance={selectedDistance}
                href={chooseHref(selectedBranch.slug)}
                ctaLabel={ctaLabel}
                onClose={() => setSelected(null)}
                compact
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-light/70">
              Toca un pin en el mapa o elige una sucursal abajo.
            </p>
          )}

          <div className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ordered.map(({ branch, distance }) => {
              const active = branch.slug === selected;
              return (
                <button
                  key={branch.slug}
                  type="button"
                  onClick={() => pick(branch.slug)}
                  className={`snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                    active
                      ? "border-accent bg-accent text-brand-deep"
                      : "border-white/15 bg-white/5 text-light/85"
                  }`}
                >
                  {branch.name}
                  {distance != null && (
                    <span className={active ? "text-brand-deep/70" : "text-accent-soft"}>
                      {" · "}
                      {formatDistance(distance)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {branches.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(5,26,47,0.85)] p-6 text-center backdrop-blur">
          <div className="max-w-sm">
            <p className="font-display text-2xl font-semibold">Aún no hay sucursales publicadas</p>
            <p className="mt-2 text-sm text-light/65">
              Cuando actives tiendas en el panel, aparecerán aquí con su pin en el mapa.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function BranchDetail({
  branch,
  distance,
  href,
  ctaLabel,
  onClose,
  compact = false,
}: {
  branch: BranchMapItem;
  distance: number | null;
  href: string;
  ctaLabel: string;
  onClose: () => void;
  compact?: boolean;
}) {
  const mapsHref =
    branch.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${branch.name}, ${branch.address}, ${branch.city}`
    )}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/12 bg-[rgba(7,31,55,0.92)] p-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-deep">
          <PinIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.82rem] font-semibold text-light">{branch.name}</p>
          <p className="truncate text-[0.66rem] text-light/60">
            {distance != null ? `${formatDistance(distance)} · ` : ""}
            {branch.address}
          </p>
        </div>
        <a
          href={href}
          className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[0.66rem] font-bold text-brand-deep transition hover:bg-accent-soft"
        >
          Pedir
        </a>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[rgba(7,31,55,0.94)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Quitar selección"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-light/70 transition hover:bg-white/20 hover:text-light"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className={compact ? "px-4 py-3" : "px-5 py-4"}>
        <div className="flex items-start gap-3 pr-8">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-deep">
            <PinIcon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-accent-soft">
              Sucursal elegida
            </p>
            <h2 className="truncate font-display text-lg font-semibold leading-tight text-light">
              {branch.name}
            </h2>
            <p className="mt-0.5 truncate text-xs text-light/60">{branch.address}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-light/60">
          {distance != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-semibold text-accent-soft">
              <RouteIcon className="h-3 w-3" /> {formatDistance(distance)} de ti
            </span>
          )}
          {branch.hours && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3 w-3" /> {branch.hours}
            </span>
          )}
          <span>
            {branch.deliveryEnabled && branch.pickupEnabled
              ? "Delivery y retiro"
              : branch.deliveryEnabled
                ? "Delivery a domicilio"
                : branch.pickupEnabled
                  ? "Retiro en tienda"
                  : "Atención en tienda"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <a
            href={href}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-brand-deep shadow-[0_14px_30px_-16px_rgba(232,190,26,0.9)] transition hover:bg-accent-soft"
          >
            {ctaLabel}
            <ArrowIcon className="h-4 w-4" />
          </a>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-light/80 transition hover:border-accent hover:text-accent-soft"
            aria-label="Cómo llegar"
            title="Cómo llegar"
          >
            <RouteIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.62rem] text-light/60">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent" /> Sucursal
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white ring-2 ring-accent/60" /> Tú
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MotorcycleIcon className="h-3.5 w-3.5 text-accent-soft" /> Delivery a domicilio
      </span>
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center text-light/80 transition hover:bg-white/10 hover:text-accent-soft"
    >
      {children}
    </button>
  );
}

/* ---- icons ---- */
function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function CrosshairIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}
function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
function RouteIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <path d="M8.4 18H14a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h5.6" strokeLinecap="round" />
    </svg>
  );
}
function MotorcycleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="5" cy="17" r="3.2" />
      <circle cx="19" cy="17" r="3.2" />
      <path d="M8.2 17h6.3l-2.8-6H9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 11l1.6-3.2H19M12.2 5h2.6" strokeLinecap="round" />
    </svg>
  );
}
