"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

type OrderNote = {
  id: string;
  orderNumber: string;
  total: number;
  customerName: string;
  createdAt: string;
  seen?: boolean;
};

const MAX_NOTES = 20;

export function OrderNotifications() {
  const router = useRouter();
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<OrderNote | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const unread = notes.filter((n) => !n.seen).length;

  // ── Pleasant two-tone "ding" via Web Audio (no asset needed) ──
  const playDing = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctx());
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      [
        [880, 0],
        [1174.66, 0.14],
      ].forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + offset;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch {
      /* audio not available */
    }
  }, []);

  // Unlock audio on the first user interaction (browser autoplay policy).
  useEffect(() => {
    const unlock = () => {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
        void audioCtxRef.current?.resume();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Ask for OS notification permission once.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const handleNewOrder = useCallback(
    (order: OrderNote) => {
      setNotes((prev) => {
        if (prev.some((n) => n.id === order.id)) return prev; // de-dupe
        return [{ ...order, seen: false }, ...prev].slice(0, MAX_NOTES);
      });

      // Toast
      setToast(order);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 7000);

      // Sound
      playDing();

      // OS notification (works even if the tab is in the background)
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification("Nuevo pedido · Toby ¡Mi Hamburguesa!", {
            body: `${order.orderNumber} — ${formatPrice(order.total)} · ${order.customerName}`,
            tag: order.id,
          });
          n.onclick = () => {
            window.focus();
            router.push(`/admin/orders/${order.id}`);
          };
        }
      } catch {
        /* ignore */
      }

      // Refresh server components so lists/counts update live.
      router.refresh();
    },
    [playDing, router]
  );

  // ── New-order polling ──
  // A short request every 10 s (every 30 s while the tab is in the background,
  // so the sound + OS notification still arrive). Unlike the old
  // always-open SSE stream it never ties up one of the browser's ~6 connections
  // per site, which is what made admin pages hang until a hard refresh.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let since = new Date().toISOString();
    const seen = new Set<string>();

    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/admin/orders/latest?since=${encodeURIComponent(since)}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          // Signed out (e.g. this account just signed in on another device) — leave the dashboard.
          const { reason } = (await res.json().catch(() => ({}))) as { reason?: string | null };
          stopped = true;
          window.location.replace(reason ? `/admin/login?signed_out=${reason}` : "/admin/login");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { orders: { id: string; createdAt: string }[] };
        setConnected(true);
        for (const order of data.orders) {
          if (order.createdAt > since) since = order.createdAt;
          if (seen.has(order.id)) continue;
          seen.add(order.id);
          handleNewOrder(order as Parameters<typeof handleNewOrder>[0]);
        }
      } catch {
        setConnected(false);
      }
    };

    const loop = async () => {
      await check();
      if (!stopped) timer = setTimeout(loop, document.visibilityState === "visible" ? 10_000 : 30_000);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    timer = setTimeout(loop, 1500); // let the page finish loading first
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [handleNewOrder]);

  const markAllSeen = () =>
    setNotes((prev) => prev.map((n) => ({ ...n, seen: true })));

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) markAllSeen();
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Bell */}
      <button
        onClick={toggle}
        aria-label={`Notificaciones${unread ? ` (${unread} nuevos)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-light/85 transition hover:bg-brand-dark hover:text-accent"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[0.62rem] font-bold text-brand ring-2 ring-brand">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {/* live-connection dot */}
        <span
          title={connected ? "En vivo" : "Reconectando…"}
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-brand ${
            connected ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--line)] bg-surface text-ink shadow-[0_24px_60px_-24px_rgba(110,10,6,0.5)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <span className="font-display text-base font-semibold">Notificaciones</span>
              <span className="text-[0.68rem] text-muted">
                {connected ? "● En vivo" : "○ Reconectando"}
              </span>
            </div>
            {notes.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                Aún no hay pedidos nuevos. Los nuevos pedidos aparecerán aquí al instante.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-[var(--line)] overflow-y-auto">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/admin/orders/${n.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition hover:bg-cream-soft"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-accent-strong">{n.orderNumber}</span>
                        <span className="text-sm font-semibold [font-variant-numeric:tabular-nums]">
                          {formatPrice(n.total)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {n.customerName} · {timeAgo(n.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/orders"
              onClick={() => setOpen(false)}
              className="block border-t border-[var(--line)] px-4 py-2.5 text-center text-sm text-accent-strong hover:bg-cream-soft"
            >
              Ver todos los pedidos →
            </Link>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <Link
          href={`/admin/orders/${toast.id}`}
          onClick={() => setToast(null)}
          className="fixed bottom-5 right-5 z-[60] flex w-[19rem] items-start gap-3 rounded-xl border border-accent/40 bg-surface p-4 text-ink shadow-[0_24px_60px_-20px_rgba(110,10,6,0.55)] animate-[toastin_.35s_ease]"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-accent text-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8h12l-1 12H7L6 8z" strokeLinejoin="round" />
              <path d="M9 8a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Nuevo pedido recibido 🎉</span>
            <span className="mt-0.5 block truncate text-xs text-muted">
              {toast.orderNumber} · {formatPrice(toast.total)} · {toast.customerName}
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ahora mismo";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
