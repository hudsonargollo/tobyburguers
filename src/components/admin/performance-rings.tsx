"use client";

import { useEffect, useState } from "react";
import type { StorePerformance } from "@/lib/admin-data";

type Gauge = {
  label: string;
  sub: string;
  pct: number;
  from: string; // gradient start
  to: string; // gradient end (also the number colour)
};

export function PerformanceRings({ data }: { data: StorePerformance }) {
  const gauges: Gauge[] = [
    {
      label: "Pedidos entregados",
      sub: `${data.delivered} de ${data.totalOrders} entregados`,
      pct: data.fulfillmentPct,
      from: "#ffa25c",
      to: "#ce5f10",
    },
    {
      label: "Pagos cobrados",
      sub: `${data.paid} de ${data.totalOrders} pagados`,
      pct: data.paymentPct,
      from: "#34d399",
      to: "#059669",
    },
    {
      label: "Catálogo con stock",
      sub: `${data.inStock} de ${data.totalProducts} productos`,
      pct: data.stockPct,
      from: "#5eead4",
      to: "#0d9488",
    },
  ];

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6">
      <span className="eyebrow">Rendimiento</span>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Salud de la tienda</h2>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {gauges.map((g, i) => (
          <Ring key={g.label} gauge={g} delay={i * 120} />
        ))}
      </div>
    </section>
  );
}

const SIZE = 132;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function Ring({ gauge, delay }: { gauge: Gauge; delay: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(r);
  }, []);

  const pct = Math.max(0, Math.min(100, gauge.pct));
  const offset = shown ? CIRC * (1 - pct / 100) : CIRC;
  const gid = `ring-${gauge.label.replace(/\s+/g, "")}`;

  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--line)] bg-cream-soft px-3 py-5">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={gauge.from} />
              <stop offset="100%" stopColor={gauge.to} />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            style={{ stroke: "var(--line)" }}
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: `stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-[1.9rem] font-bold leading-none [font-variant-numeric:tabular-nums]"
            style={{ color: gauge.to }}
          >
            {pct}
            <span className="text-base align-top">%</span>
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-ink">{gauge.label}</p>
      <p className="mt-0.5 text-xs text-muted">{gauge.sub}</p>
    </div>
  );
}
