"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { AdminNav } from "./admin-nav";
import { AdminMobileNav } from "./admin-mobile-nav";
import { OrderNotifications } from "./order-notifications";
import { logoutAction } from "@/app/admin/login/actions";

const STORAGE_KEY = "toby-admin-collapsed";

// Sidebar collapsed state persisted in localStorage (tiny external store).
const collapseListeners = new Set<() => void>();
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
  collapseListeners.forEach((l) => l());
}
function subscribeCollapsed(l: () => void) {
  collapseListeners.add(l);
  return () => collapseListeners.delete(l);
}

export function AdminShell({
  email,
  role = "ADMIN",
  branchName = null,
  children,
}: {
  email: string;
  role?: string;
  branchName?: string | null;
  children: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // `ready` gates the width transition so the saved state applies instantly on
  // load (no animate-on-refresh); transitions only kick in for real toggles.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // enable transitions on the next frames, after the saved width is applied
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(r);
  }, []);

  const toggle = () => writeCollapsed(!collapsed);

  // Fade labels; when expanding, delay so they appear after the width has grown.
  const labelStyle: React.CSSProperties = {
    transition: `opacity 180ms ease ${collapsed ? "0ms" : "130ms"}`,
  };
  const labelCls = `whitespace-nowrap ${collapsed ? "opacity-0" : "opacity-100"}`;

  return (
    // Full-height app frame — nothing scrolls here; the two panes scroll on their own.
    <div style={{ height: "100dvh" }} className="flex overflow-hidden bg-cream">
      {/* ── Sidebar (desktop) ── */}
      <aside
        style={{
          width: collapsed ? 76 : 240,
          transition: ready ? "width 300ms cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
        }}
        className="hidden h-full shrink-0 flex-col overflow-hidden border-r border-[var(--line)] bg-brand text-light md:flex"
      >
        {/* Brand — the full lockup, also in the collapsed rail. */}
        <Link
          href="/admin"
          aria-label="Toby — panel"
          className="flex h-16 shrink-0 items-center justify-center border-b border-[rgba(243,196,187,0.2)] px-2 md:h-20"
        >
          {collapsed ? (
            <BrandLogo className="h-6" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/imgs/logo3d.webp"
              alt="Toby ¡Mi Hamburguesa!"
              width={757}
              height={329}
              className="h-[68px] w-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
            />
          )}
        </Link>

        {/* Nav — scrolls vertically, clips labels horizontally */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <AdminNav collapsed={collapsed} role={role} />
        </div>

        {/* Footer — consistent icon+label rows so nothing jumps on collapse */}
        <div className="shrink-0 border-t border-[rgba(243,196,187,0.2)] p-3">
          <p
            style={labelStyle}
            className={`truncate px-3 pb-1 text-xs text-light/70 ${collapsed ? "opacity-0" : "opacity-100"}`}
          >
            {role === "ADMIN"
              ? "Todas las sucursales"
              : branchName
                ? `Sucursal: ${branchName}`
                : "Sin sucursal asignada"}
          </p>
          <p
            style={labelStyle}
            className={`truncate px-3 pb-1.5 text-xs text-light/50 ${collapsed ? "opacity-0" : "opacity-100"}`}
          >
            {email}
          </p>
          <form action={logoutAction}>
            <button
              title={collapsed ? "Cerrar sesión" : undefined}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-light/80 transition-colors hover:bg-brand-dark hover:text-accent"
            >
              <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M15 12H4M9 7l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={labelStyle} className={labelCls}>
                Cerrar sesión
              </span>
            </button>
          </form>
          <Link
            href="/"
            title={collapsed ? "Ver tienda" : undefined}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-light/60 transition-colors hover:text-accent"
          >
            <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 11l9-7 9 7M5 10v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={labelStyle} className={labelCls}>
              Ver tienda
            </span>
          </Link>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top bar (fixed height) */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] bg-brand px-4 text-light md:h-20">
          <div className="flex items-center gap-2">
            {/* Desktop sidebar toggle — clear, always visible */}
            <button
              onClick={toggle}
              aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
              title={collapsed ? "Expandir menú" : "Contraer menú"}
              className="hidden h-9 w-9 items-center justify-center rounded-md text-light/85 transition-colors hover:bg-brand-dark hover:text-accent md:flex"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="9" y1="4" x2="9" y2="20" />
                <path
                  d={collapsed ? "M13.5 9.5l2.5 2.5-2.5 2.5" : "M16.5 9.5L14 12l2.5 2.5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {/* Mobile brand */}
            <Link href="/admin" aria-label="Toby — panel" className="md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/imgs/logo3d.webp"
                alt="Toby ¡Mi Hamburguesa!"
                width={757}
                height={329}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3 text-sm sm:gap-4">
            <OrderNotifications />
            <Link href="/" className="text-light/70 transition-colors hover:text-accent md:hidden">
              Ver tienda
            </Link>
            <form action={logoutAction} className="md:hidden">
              <button className="text-light/80 transition-colors hover:text-accent">Cerrar sesión</button>
            </form>
          </div>
        </header>

        {/* Mobile nav (fixed height) */}
        <div className="shrink-0">
          <AdminMobileNav role={role} />
        </div>

        {/* Scrollable content — this pane scrolls, the sidebar does not */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div style={{ maxWidth: 1600 }} className="mx-auto w-full px-5 py-8 sm:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
