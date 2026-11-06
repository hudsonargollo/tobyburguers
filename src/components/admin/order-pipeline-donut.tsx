"use client";

import { useState } from "react";
import type { StatusCount } from "@/lib/admin-data";

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "#d99a2b" },
  CONFIRMED: { label: "Confirmado", color: "#6366f1" },
  PROCESSING: { label: "En preparación", color: "#0ea5e9" },
  SHIPPED: { label: "Enviado", color: "#8b5cf6" },
  DELIVERED: { label: "Entregado", color: "#10b981" },
  CANCELLED: { label: "Cancelado", color: "#e11d48" },
};

const SIZE = 260;
const CENTER = SIZE / 2;
const R = 92; // middle radius of the ring
const THICK = 30;
const C = 2 * Math.PI * R;
const GAP = 6; // px gap between segments (in path units)

function meta(status: string) {
  return STATUS_META[status] ?? { label: status, color: "#7e917f" };
}

export function OrderPipelineDonut({ counts, total }: { counts: StatusCount[]; total: number }) {
  const [active, setActive] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // segments only for statuses with orders
  const visible = counts.filter((c) => c.count > 0);
  const single = visible.length === 1;

  // Each segment starts where the previous ones end (prefix sums of fractions).
  const fracs = visible.map((c) => c.count / total);
  const starts = fracs.map((_, i) => fracs.slice(0, i).reduce((n, f) => n + f, 0));
  const segments = visible.map((c, i) => {
    const frac = fracs[i];
    const len = frac * C;
    const drawn = single ? C : Math.max(len - GAP, 2);
    return {
      status: c.status,
      color: meta(c.status).color,
      dashArray: `${drawn} ${C - drawn}`,
      dashOffset: -(starts[i] * C),
      frac,
      count: c.count,
    };
  });

  const activeData = active ? counts.find((c) => c.status === active) : null;
  const centerLabel = activeData ? meta(activeData.status).label : "Pedidos totales";
  const centerValue = activeData ? activeData.count : total;
  const centerShare = activeData && total > 0 ? Math.round((activeData.count / total) * 100) : null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6">
      <span className="eyebrow">Cumplimiento</span>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Flujo de pedidos</h2>

      {total === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-[var(--line)] py-10 text-center text-sm text-muted">
          Aún no hay pedidos: el flujo se completará a medida que lleguen.
        </p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8">
          {/* Donut */}
          <div
            className="relative shrink-0"
            style={{ width: 220, height: 220 }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            onMouseLeave={() => {
              setActive(null);
              setCursor(null);
            }}
          >
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
              {/* track */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={R}
                fill="none"
                style={{ stroke: "var(--color-cream-soft)" }}
                strokeWidth={THICK}
              />
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                {segments.map((s) => {
                  const isActive = active === s.status;
                  const dim = active && !isActive;
                  return (
                    <circle
                      key={s.status}
                      cx={CENTER}
                      cy={CENTER}
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={isActive ? THICK + 9 : THICK}
                      strokeDasharray={s.dashArray}
                      strokeDashoffset={s.dashOffset}
                      strokeLinecap="butt"
                      style={{
                        opacity: dim ? 0.32 : 1,
                        cursor: "pointer",
                        transition: "stroke-width 160ms ease, opacity 160ms ease",
                      }}
                      onMouseEnter={() => setActive(s.status)}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[0.66rem] font-medium uppercase tracking-[0.14em] text-muted">
                {centerLabel}
              </span>
              <span className="font-display text-4xl font-bold text-ink [font-variant-numeric:tabular-nums]">
                {centerValue}
              </span>
              {centerShare != null && (
                <span className="text-xs font-semibold" style={{ color: activeData ? meta(activeData.status).color : undefined }}>
                  {centerShare}%
                </span>
              )}
            </div>

            {/* Tooltip near cursor */}
            {activeData && cursor && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-[var(--line)] bg-surface px-3 py-2 shadow-[0_14px_34px_-16px_rgba(110,10,6,0.5)]"
                style={{
                  left: Math.min(Math.max(cursor.x, 60), 220 - 60),
                  top: Math.max(cursor.y - 12, 4),
                  transform: "translate(-50%, -100%)",
                }}
              >
                <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: meta(activeData.status).color }} />
                  {meta(activeData.status).label}
                </span>
                <span className="mt-0.5 block font-display text-base font-semibold text-ink [font-variant-numeric:tabular-nums]">
                  {activeData.count} pedido{activeData.count === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>

          {/* Legend */}
          <ul className="w-full max-w-[220px] space-y-2.5">
            {counts.map((c) => {
              const m = meta(c.status);
              const share = total > 0 ? Math.round((c.count / total) * 100) : 0;
              const isActive = active === c.status;
              return (
                <li
                  key={c.status}
                  onMouseEnter={() => c.count > 0 && setActive(c.status)}
                  onMouseLeave={() => setActive(null)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                    isActive ? "bg-cream-soft" : ""
                  } ${c.count > 0 ? "cursor-pointer" : "opacity-55"}`}
                >
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                    {m.label}
                  </span>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">{c.count}</span>
                    <span className="w-9 text-right text-xs text-muted">{share}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
